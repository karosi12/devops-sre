resource "aws_security_group" "rds" {
  name        = "rds-postgres-sg"
  description = "Allow PostgreSQL traffic"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_subnet_group" "main" {
  name       = "main"
  subnet_ids = var.private_subnets

  tags = {
    Name        = "db-sg"
    Environment = var.environment
  }
}

resource "aws_rds_cluster" "rds_cluster" {
  cluster_identifier     = var.cluster_identifier
  engine                 = "aurora-postgresql"
  engine_version         = "17.5" # Specify a valid engine version
  master_username        = var.master_username
  master_password        = var.master_password
  database_name          = var.database_name
  skip_final_snapshot    = true
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  serverlessv2_scaling_configuration {
    min_capacity = 0.5
    max_capacity = 2
  }

  tags = {
    Name        = "aurora-postgres-cluster"
    Environment = var.environment
  }
}

resource "aws_rds_cluster_instance" "rds_cluster" {
  identifier          = "${var.cluster_identifier}-instance-1"
  cluster_identifier  = aws_rds_cluster.rds_cluster.id
  instance_class      = "db.serverless" # serverless v2 for cost efficiency
  engine              = aws_rds_cluster.rds_cluster.engine
  engine_version      = aws_rds_cluster.rds_cluster.engine_version
  publicly_accessible = false

  tags = {
    Name        = "aurora-postgres-instance"
    Environment = var.environment
  }
}

resource "aws_db_proxy" "db_proxy" {
  name                   = var.proxy_name
  engine_family          = "POSTGRESQL"
  role_arn               = aws_iam_role.rds_proxy_role.arn
  vpc_subnet_ids         = var.private_subnets
  vpc_security_group_ids = [aws_security_group.rds.id]
  auth {
    description = "RDS Proxy Auth"
    iam_auth    = "DISABLED"
    secret_arn  = aws_secretsmanager_secret_version.rds_proxy_secret_version.arn
  }
  require_tls = true
}

resource "aws_secretsmanager_secret" "rds_proxy_secret" {
  name = var.rds_proxy_secret_name
}

resource "aws_secretsmanager_secret_version" "rds_proxy_secret_version" {
  secret_id = aws_secretsmanager_secret.rds_proxy_secret.id

  secret_string = jsonencode({
    username = var.master_username
    password = var.master_password
  })
}

resource "aws_iam_policy" "rds_proxy_policy" {
  name        = "rds_proxy_policy"
  description = "Policy for RDS Proxy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "rds:*",
          "secretsmanager:GetSecretValue",
          "kms:Decrypt"
        ]
        Resource = "*"
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "rds_proxy_policy_attachment" {
  role       = aws_iam_role.rds_proxy_role.name
  policy_arn = aws_iam_policy.rds_proxy_policy.arn
}

resource "aws_iam_role" "rds_proxy_role" {
  name = "rds-proxy-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "rds.amazonaws.com"
        }
      },
    ]
  })
}