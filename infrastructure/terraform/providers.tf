# ============================================================================
# AriaCloud (ariacloudservices.org) — Multi-Region Terraform Providers
# Primary Compute/DB/Storage: me-central-1 (UAE)
# Edge ACM/CloudFront/Bedrock: us-east-1 (N. Virginia)
# Inbound SES Receipt Rules:   eu-west-1 (Ireland)
# ============================================================================

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

# Primary Region: Middle East (UAE) — me-central-1
provider "aws" {
  region = var.aws_primary_region

  default_tags {
    tags = {
      Project     = "AriaCloud"
      Domain      = var.root_domain
      Mission     = "Afghan Digital Enablement Initiative"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Edge Region: US East (N. Virginia) — required for CloudFront ACM Certificates & Nova Canvas
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = "AriaCloud"
      Domain      = var.root_domain
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# SES Inbound Region: Europe (Ireland) — eu-west-1 (since me-central-1 is outbound-only for SES)
provider "aws" {
  alias  = "eu_west_1"
  region = "eu-west-1"

  default_tags {
    tags = {
      Project     = "AriaCloud"
      Domain      = var.root_domain
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
