resource "aws_security_group" "elasticache" {
  name        = "elasticache security group"
  description = "Allow Elasticache traffic"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = {
    Name        = "cache"
    environment = var.environment
  }
}

resource "aws_elasticache_parameter_group" "redis" {
  name        = "redis"
  description = "Parameter group for Redis "
  family      = "redis7"
  tags = {
    Name        = "cache"
    environment = var.environment
  }
}

resource "aws_elasticache_cluster" "elasticache_cluster" {
  cluster_id           = var.cluster_id
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = aws_elasticache_parameter_group.redis.name
  subnet_group_name    = aws_elasticache_subnet_group.elasticache_subnet_group.name
  security_group_ids   = [aws_security_group.elasticache.id]
  tags = {
    Name        = "cache"
    environment = var.environment
  }
}

resource "aws_elasticache_subnet_group" "elasticache_subnet_group" {
  name       = "elasticache-subnet-group"
  subnet_ids = var.private_subnets
  tags = {
    Name        = "cache"
    environment = var.environment
  }
}

