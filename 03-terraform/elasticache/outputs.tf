output "elasticache_endpoint" {
  value = aws_elasticache_cluster.elasticache_cluster.cache_nodes[0].address
}
