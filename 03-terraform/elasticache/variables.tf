variable "vpc_id" {
  type = string
}

variable "vpc_cidr" {
  type = string
}

variable "private_subnets" {
  type = list(string)
}

variable "cluster_id" {
  type = string
}

variable "environment" {
  type = string
}