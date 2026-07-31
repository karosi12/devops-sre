variable "vpc_id" {
  type = string
}

variable "vpc_cidr" {
  type = string
}

variable "proxy_name" {
  type = string
}

variable "private_subnets" {
  type = list(string)
}

variable "cluster_identifier" {
  type = string
}

variable "master_username" {
  type = string
}

variable "master_password" {
  type = string
}

variable "database_name" {
  type = string
}

variable "rds_proxy_secret_name" {
  type = string
}

variable "environment" {
  type = string
}
