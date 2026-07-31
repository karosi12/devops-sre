# --- MSK Configuration ---
resource "aws_msk_configuration" "kafka_config" {
  name = "${var.broker_name}-config"

  kafka_versions = ["3.6.0"]

  server_properties = <<PROPERTIES
auto.create.topics.enable = true
delete.topic.enable = true
default.replication.factor = 2
min.insync.replicas = 1
num.partitions = 3
PROPERTIES
}

resource "aws_msk_cluster" "kafka_cluster" {
  cluster_name           = var.broker_name
  kafka_version          = var.engine_version
  number_of_broker_nodes = var.broker_nodes

  broker_node_group_info {
    instance_type   = var.host_instance_type
    client_subnets  = var.subnet_ids
    security_groups = [aws_security_group.msk_sg.id]
  }

  configuration_info {
    arn      = aws_msk_configuration.kafka_config.arn
    revision = aws_msk_configuration.kafka_config.latest_revision
  }

  encryption_info {
    encryption_in_transit {
      client_broker = "TLS"
      in_cluster    = true
    }
  }

  tags = {
    Name        = var.broker_name
    Environment = var.environment
  }
}

# --- Security Group for MSK ---
resource "aws_security_group" "msk_sg" {
  name        = "${var.broker_name}-msk-sg"
  description = "Security group for Amazon MSK Kafka cluster"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Allow Kafka traffic (TLS 9094) from ECS Fargate"
    from_port       = 9094
    to_port         = 9094
    protocol        = "tcp"
    security_groups = [var.ecs_tasks_sg_id] # only ECS tasks allowed
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.broker_name}-sg"
  }
}

