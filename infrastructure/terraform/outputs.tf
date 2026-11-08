output "route53_nameservers" {
  description = "Point ariacloudservices.org registrar nameservers to these 4 AWS Route 53 servers"
  value       = aws_route53_zone.master.name_servers
}

output "aurora_writer_endpoint" {
  description = "Aurora PostgreSQL Serverless v2 Writer Endpoint (me-central-1)"
  value       = aws_rds_cluster.aurora_postgres.endpoint
}

output "cdn_cloudfront_domain" {
  description = "CloudFront distribution domain backing cdn.ariacloudservices.org"
  value       = aws_cloudfront_distribution.cdn_assets.domain_name
}

output "merchant_wildcard_cloudfront_domain" {
  description = "CloudFront distribution domain backing *.ariacloudservices.org"
  value       = aws_cloudfront_distribution.merchant_wildcard.domain_name
}

output "mail_server_static_ip" {
  description = "Static Elastic IP assigned to mail.ariacloudservices.org"
  value       = aws_eip.mail_static_ip.public_ip
}
