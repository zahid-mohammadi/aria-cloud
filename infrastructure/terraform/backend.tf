# ============================================================================
# AriaCloud (ariacloudservices.org) — Terraform Remote State Configuration
# Stores state centrally in encrypted S3 with DynamoDB locking.
# ============================================================================

terraform {
  backend "s3" {
    bucket         = "ariacloud-terraform-state-me-central-1"
    key            = "platform/production/terraform.tfstate"
    region         = "me-central-1"
    dynamodb_table = "ariacloud-terraform-locks"
    encrypt        = true
  }
}
