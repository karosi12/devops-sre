output "msk_security_group_id" {
  description = "Security group ID for the MSK cluster"
  value       = aws_security_group.msk_sg.id
}

output "msk_bootstrap_brokers_tls" {
  description = "Bootstrap broker string for TLS connection"
  value       = aws_msk_cluster.kafka_cluster.bootstrap_brokers_tls
}
