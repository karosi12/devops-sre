output "rds_endpoint" {
  value = aws_rds_cluster.rds_cluster.endpoint
}

output "rds_reader_endpoint" {
  value = aws_rds_cluster.rds_cluster.reader_endpoint
}
output "db_name" {
  description = "The name of the RDS database"
  value       = aws_rds_cluster.rds_cluster.database_name
}
