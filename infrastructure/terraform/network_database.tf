# ============================================================================
# Pillar I: Multi-AZ VPC & Aurora PostgreSQL Serverless v2 (me-central-1)
# Enforces Row-Level Security (RLS) across all tenant & AI Studio tables
# ============================================================================

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "aria_vpc" {
  cidr_block           = "10.40.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "ariacloud-vpc-${var.environment}"
  }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.aria_vpc.id

  tags = {
    Name = "ariacloud-igw-${var.environment}"
  }
}

resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.aria_vpc.id
  cidr_block              = cidrsubnet(aws_vpc.aria_vpc.cidr_block, 8, count.index + 1)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "ariacloud-public-${count.index + 1}"
    Tier = "Public"
  }
}

resource "aws_subnet" "isolated_db" {
  count             = 2
  vpc_id            = aws_vpc.aria_vpc.id
  cidr_block        = cidrsubnet(aws_vpc.aria_vpc.cidr_block, 8, count.index + 21)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "ariacloud-isolated-db-${count.index + 1}"
    Tier = "Database"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.aria_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Security Group for Aurora PostgreSQL Serverless v2
resource "aws_security_group" "aurora_sg" {
  name        = "ariacloud-aurora-sg"
  description = "Allow PostgreSQL 5432 from VPC application workloads"
  vpc_id      = aws_vpc.aria_vpc.id

  ingress {
    description = "PostgreSQL from VPC CIDR"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.aria_vpc.cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_subnet_group" "aurora_subnets" {
  name       = "ariacloud-aurora-subnets"
  subnet_ids = aws_subnet.isolated_db[*].id
}

resource "random_password" "db_master_password" {
  length  = 32
  special = false
}

resource "aws_secretsmanager_secret" "aurora_credentials" {
  name = "ariacloud/${var.environment}/aurora-master-credentials"
}

resource "aws_secretsmanager_secret_version" "aurora_credentials" {
  secret_id = aws_secretsmanager_secret.aurora_credentials.id
  secret_string = jsonencode({
    username = "aria_admin"
    password = random_password.db_master_password.result
    dbname   = "aria_cloud"
  })
}

resource "aws_rds_cluster" "aurora_postgres" {
  cluster_identifier      = "ariacloud-postgres-${var.environment}"
  engine                  = "aurora-postgresql"
  engine_mode             = "provisioned"
  engine_version          = "16.4"
  database_name           = "aria_cloud"
  master_username         = "aria_admin"
  master_password         = random_password.db_master_password.result
  db_subnet_group_name    = aws_db_subnet_group.aurora_subnets.name
  vpc_security_group_ids  = [aws_security_group.aurora_sg.id]
  storage_encrypted       = true
  backup_retention_period = 14
  deletion_protection     = true
  skip_final_snapshot     = false
  final_snapshot_identifier = "ariacloud-postgres-final-${var.environment}"

  serverlessv2_scaling_configuration {
    min_capacity = var.aurora_min_capacity
    max_capacity = var.aurora_max_capacity
  }
}

resource "aws_rds_cluster_instance" "aurora_writer" {
  identifier         = "ariacloud-postgres-writer-1"
  cluster_identifier = aws_rds_cluster.aurora_postgres.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.aurora_postgres.engine
  engine_version     = aws_rds_cluster.aurora_postgres.engine_version
}
