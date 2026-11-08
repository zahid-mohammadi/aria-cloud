# ============================================================================
# Pillar III: Amazon SES (me-central-1) + Stalwart Mail Server (EC2 Graviton + EFS)
# Hostname: mail.ariacloudservices.org
# ============================================================================

# 1. Amazon SES Domain Identity & 2048-bit Easy-DKIM in me-central-1
resource "aws_ses_domain_identity" "root" {
  domain = var.root_domain
}

resource "aws_ses_domain_dkim" "root" {
  domain = aws_ses_domain_identity.root.domain
}

resource "aws_route53_record" "ses_dkim" {
  count   = 3
  zone_id = aws_route53_zone.master.zone_id
  name    = "${aws_ses_domain_dkim.root.dkim_tokens[count.index]}._domainkey.${var.root_domain}"
  type    = "CNAME"
  ttl     = 600
  records = ["${aws_ses_domain_dkim.root.dkim_tokens[count.index]}.dkim.amazonses.com"]
}

# Custom MAIL FROM Subdomain (bounce.ariacloudservices.org -> feedback-smtp.me-central-1.amazonses.com)
resource "aws_ses_domain_mail_from" "bounce" {
  domain           = aws_ses_domain_identity.root.domain
  mail_from_domain = "bounce.${var.root_domain}"
}

resource "aws_route53_record" "bounce_mx" {
  zone_id = aws_route53_zone.master.zone_id
  name    = aws_ses_domain_mail_from.bounce.mail_from_domain
  type    = "MX"
  ttl     = 600
  records = ["10 feedback-smtp.${var.aws_primary_region}.amazonses.com"]
}

resource "aws_route53_record" "bounce_spf" {
  zone_id = aws_route53_zone.master.zone_id
  name    = aws_ses_domain_mail_from.bounce.mail_from_domain
  type    = "TXT"
  ttl     = 600
  records = ["v=spf1 include:amazonses.com ~all"]
}

# 2. Stalwart Mail Server & SnappyMail Webmail Host (EC2 Graviton t4g.small + Encrypted EFS)
resource "aws_eip" "mail_static_ip" {
  domain = "vpc"

  tags = {
    Name = "mail.${var.root_domain}-eip"
  }
}

resource "aws_efs_file_system" "stalwart_mail_store" {
  creation_token = "ariacloud-stalwart-efs-${var.environment}"
  encrypted      = true

  tags = {
    Name = "ariacloud-stalwart-mail-efs"
  }
}

# Route 53 A, MX, SPF, and DMARC Records for mail.ariacloudservices.org & ariacloudservices.org
resource "aws_route53_record" "mail_a" {
  zone_id = aws_route53_zone.master.zone_id
  name    = "mail.${var.root_domain}"
  type    = "A"
  ttl     = 300
  records = [aws_eip.mail_static_ip.public_ip]
}

resource "aws_route53_record" "root_mx" {
  zone_id = aws_route53_zone.master.zone_id
  name    = var.root_domain
  type    = "MX"
  ttl     = 300
  records = [
    "10 mail.${var.root_domain}",
    "20 feedback-smtp.${var.aws_primary_region}.amazonses.com",
  ]
}

resource "aws_route53_record" "root_spf" {
  zone_id = aws_route53_zone.master.zone_id
  name    = var.root_domain
  type    = "TXT"
  ttl     = 300
  records = ["v=spf1 include:amazonses.com ip4:${aws_eip.mail_static_ip.public_ip} ~all"]
}

resource "aws_route53_record" "root_dmarc" {
  zone_id = aws_route53_zone.master.zone_id
  name    = "_dmarc.${var.root_domain}"
  type    = "TXT"
  ttl     = 300
  records = ["v=DMARC1; p=quarantine; rua=mailto:${var.postmaster_email}; pct=100;"]
}
