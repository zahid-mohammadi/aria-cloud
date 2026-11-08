variable "environment" {
  description = "Deployment environment (production or staging)"
  type        = string
  default     = "production"
}

variable "aws_primary_region" {
  description = "Primary AWS region for low-latency Afghan & Middle East routing"
  type        = string
  default     = "me-central-1"
}

variable "root_domain" {
  description = "Canonical root domain for AriaCloud"
  type        = string
  default     = "ariacloudservices.org"
}

variable "support_email" {
  description = "Support email address"
  type        = string
  default     = "support@ariacloudservices.org"
}

variable "system_from_email" {
  description = "System transactional sender address"
  type        = string
  default     = "no-reply@ariacloudservices.org"
}

variable "postmaster_email" {
  description = "DMARC aggregate report & abuse postmaster address"
  type        = string
  default     = "postmaster@ariacloudservices.org"
}

variable "public_assets_bucket_name" {
  description = "S3 bucket backing cdn.ariacloudservices.org"
  type        = string
  default     = "ariacloud-public-assets"
}

variable "aurora_min_capacity" {
  description = "Minimum ACUs for Aurora PostgreSQL Serverless v2"
  type        = number
  default     = 0.5
}

variable "aurora_max_capacity" {
  description = "Maximum ACUs for Aurora PostgreSQL Serverless v2"
  type        = number
  default     = 16.0
}
