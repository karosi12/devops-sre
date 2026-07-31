output "vpc_id" {
  value = aws_vpc.vpc_main.id
}

output "vpc_cidr" {
  description = "The CIDR block of the VPC"
  value       = aws_vpc.vpc_main.cidr_block
}

output "private_subnet" {
  value = aws_subnet.private_subnet.id
}

output "public_subnet" {
  value = aws_subnet.public_subnet.id
}

output "instance_public_ip" {
  value = aws_instance.public_instance.public_ip
}

output "instance_private_ip" {
  value = aws_instance.private_instance.private_ip
}

output "instance_public_dns" {
  value = aws_instance.public_instance.public_dns
}