provider "aws" {
  region     = var.region # Change this to your desired region
  access_key = var.access_key
  secret_key = var.secret_key
}

terraform {
  backend "s3" {
    bucket  = "terraform-state-demo-15" # Change this to your S3 bucket name
    key     = "terraform.tfstate"
    region  = "us-east-2"
    encrypt = true
  }
}

resource "aws_vpc" "vpc_main" {
  cidr_block           = var.cidr_block
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = {
    Name        = var.vpc_name
    Environment = var.environment
  }
}

# Subnets
resource "aws_subnet" "public_subnet" {
  vpc_id                  = aws_vpc.vpc_main.id
  cidr_block              = var.public_subnet_cidr
  availability_zone       = var.availability_zone
  map_public_ip_on_launch = true
  tags = {
    Name        = "${var.vpc_name}-public-subnet"
    Environment = var.environment
  }
}

resource "aws_subnet" "private_subnet" {
  vpc_id            = aws_vpc.vpc_main.id
  cidr_block        = var.private_subnet_cidr
  availability_zone = var.availability_zone
  tags = {
    Name        = "${var.vpc_name}-private-subnet"
    Environment = var.environment
  }
}

# Internet Gateway (for public access)
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.vpc_main.id

  tags = {
    Name        = "${var.vpc_name}-igw"
    Environment = var.environment
  }
}

# Public Route Table & Associations
resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.vpc_main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name        = "${var.vpc_name}-public-rt"
    Environment = var.environment
  }
}

resource "aws_route_table_association" "public_assoc" {
  subnet_id      = aws_subnet.public_subnet.id
  route_table_id = aws_route_table.public_rt.id
}

# Elastic IP for NAT Gateway
resource "aws_eip" "nat_eip" {
  domain = "vpc"

  tags = {
    Name        = "${var.vpc_name}-nat-eip"
    Environment = var.environment
  }
}

# NAT Gateway (in Public Subnet)
resource "aws_nat_gateway" "nat_gw" {
  allocation_id = aws_eip.nat_eip.id
  subnet_id     = aws_subnet.public_subnet.id

  tags = {
    Name        = "${var.vpc_name}-nat-gateway"
    Environment = var.environment
  }

  depends_on = [aws_internet_gateway.igw]
}

# Private Route Table & Associations
resource "aws_route_table" "private_rt" {
  vpc_id = aws_vpc.vpc_main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat_gw.id
  }

  tags = {
    Name        = "${var.vpc_name}-private-rt"
    Environment = var.environment
  }
}

resource "aws_route_table_association" "private_assoc" {
  subnet_id      = aws_subnet.private_subnet.id
  route_table_id = aws_route_table.private_rt.id
}

data "aws_ami" "ubuntu" {
  most_recent = true

  owners = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  filter {
    name   = "root-device-type"
    values = ["ebs"]
  }
}


resource "aws_security_group" "sg_public_instance" {
  name        = "${var.vpc_name}-sg-public"
  description = "Security group for ${var.vpc_name}-public"
  vpc_id      = aws_vpc.vpc_main.id

  # HTTP
  ingress {
    description = "Allow HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # SSH
  ingress {
    description = "Allow SSH from my IP"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["102.216.181.6/32"]
  }

  egress {
    description      = "Allow all outbound traffic"
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }
}

resource "aws_security_group" "sg_private_instance" {
  name        = "${var.vpc_name}-sg-private"
  description = "Security group for ${var.vpc_name}-private"
  vpc_id      = aws_vpc.vpc_main.id

  # HTTP
  ingress {
    description = "Allow HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # SSH
  ingress {
    description = "Allow SSH from my IP"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["${aws_subnet.public_subnet.cidr_block}"]
  }

  egress {
    description      = "Allow all outbound traffic"
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }
}

resource "tls_private_key" "generated_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "local_file" "private_key_pem" {
  content         = tls_private_key.generated_key.private_key_pem
  filename        = "${path.module}/${var.instance_name}-key.pem"
  file_permission = "0400"
}

resource "aws_key_pair" "generated" {
  key_name   = "${var.instance_name}-key"
  public_key = tls_private_key.generated_key.public_key_openssh
}

# EC2 Instance in Public Subnet
resource "aws_instance" "public_instance" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = "t3.micro"
  associate_public_ip_address = true
  vpc_security_group_ids      = [aws_security_group.sg_public_instance.id]
  key_name                    = aws_key_pair.generated.key_name # Specify your key pair name here
  subnet_id                   = aws_subnet.public_subnet.id

  tags = {
    Name        = "${var.instance_name}-public-instance"
    Environment = var.environment
  }
}

# EC2 Instance in Private Subnet
resource "aws_instance" "private_instance" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = "t3.micro"
  associate_public_ip_address = false
  vpc_security_group_ids      = [aws_security_group.sg_private_instance.id]
  key_name                    = aws_key_pair.generated.key_name # Specify your key pair name here
  subnet_id                   = aws_subnet.private_subnet.id
  tags = {
    Name        = "${var.instance_name}-private-instance"
    Environment = var.environment
  }
}
