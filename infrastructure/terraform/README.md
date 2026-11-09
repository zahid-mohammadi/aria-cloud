# AriaCloud Infrastructure (Terraform)

Multi-region AWS infrastructure for AriaCloud (`ariacloudservices.org`).

## Regions

- **Primary Compute / Database / Storage**: `me-central-1` (UAE)
- **Edge ACM & CloudFront / Bedrock**: `us-east-1` (N. Virginia)
- **SES Inbound**: `eu-west-1` (Ireland)

## State Storage & Locking

State is stored in S3 with server-side encryption and locking via DynamoDB:

- **Bucket**: `ariacloud-terraform-state-me-central-1`
- **Key**: `platform/production/terraform.tfstate`
- **DynamoDB Lock Table**: `ariacloud-terraform-locks`

### Bootstrapping the Backend (One-time)

If the state bucket and lock table do not yet exist in your AWS account, create them via the AWS CLI:

```bash
# 1. State bucket in me-central-1
aws s3api create-bucket \
  --bucket ariacloud-terraform-state-me-central-1 \
  --region me-central-1 \
  --create-bucket-configuration LocationConstraint=me-central-1

# Enable versioning & default encryption
aws s3api put-bucket-versioning \
  --bucket ariacloud-terraform-state-me-central-1 \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
  --bucket ariacloud-terraform-state-me-central-1 \
  --server-side-encryption-configuration '{
    "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]
  }'

# 2. DynamoDB lock table
aws dynamodb create-table \
  --table-name ariacloud-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region me-central-1
```

### Initializing Terraform

```bash
cd infrastructure/terraform
terraform init
terraform plan
```
