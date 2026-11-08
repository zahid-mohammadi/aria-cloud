# ============================================================================
# Pillar II & V: Route 53 Public Hosted Zone, ACM SSL (us-east-1),
# S3 Buckets & CloudFront Multi-Tenant Edge (ariacloudservices.org)
# ============================================================================

resource "aws_route53_zone" "master" {
  name    = var.root_domain
  comment = "AriaCloud Master Public Hosted Zone (${var.root_domain})"
}

# Wildcard SSL Certificate in us-east-1 (Required by Amazon CloudFront)
resource "aws_acm_certificate" "cloudfront_wildcard" {
  provider                  = aws.us_east_1
  domain_name               = var.root_domain
  subject_alternative_names = ["*.${var.root_domain}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "acm_validation" {
  for_each = {
    for dvo in aws_acm_certificate.cloudfront_wildcard.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.master.zone_id
}

resource "aws_acm_certificate_validation" "cloudfront_wildcard" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.cloudfront_wildcard.arn
  validation_record_fqdns = [for record in aws_route53_record.acm_validation : record.fqdn]
}

# S3 Bucket: Public Assets & AI Studio Media (cdn.ariacloudservices.org)
resource "aws_s3_bucket" "public_assets" {
  bucket = var.public_assets_bucket_name
}

resource "aws_s3_bucket_public_access_block" "public_assets" {
  bucket                  = aws_s3_bucket.public_assets.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Bucket: Multi-Tenant Merchant Websites (*.ariacloudservices.org)
resource "aws_s3_bucket" "merchant_sites" {
  bucket = "ariacloud-merchant-sites-${var.environment}"
}

resource "aws_s3_bucket_public_access_block" "merchant_sites" {
  bucket                  = aws_s3_bucket.merchant_sites.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_control" "s3_oac" {
  name                              = "ariacloud-s3-oac-${var.environment}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront Function: Rewrites <store>.ariacloudservices.org -> /tenants/<store>/...
resource "aws_cloudfront_function" "merchant_subdomain_router" {
  name    = "ariacloud-merchant-subdomain-router"
  runtime = "cloudfront-js-2.0"
  comment = "Routes *.ariacloudservices.org merchant stores to isolated S3 tenant prefixes"
  publish = true
  code    = <<-EOT
    function handler(event) {
      var request = event.request;
      var host = request.headers.host ? request.headers.host.value.toLowerCase() : "";
      var rootDomain = "${var.root_domain}";
      var sub = "landing";
      if (host.endsWith("." + rootDomain)) {
        sub = host.slice(0, host.length - (rootDomain.length + 1));
      }
      var uri = request.uri;
      if (uri.endsWith("/")) {
        uri += "index.html";
      } else if (!uri.includes(".")) {
        uri += "/index.html";
      }
      request.uri = "/tenants/" + sub + uri;
      return request;
    }
  EOT
}

# CloudFront Distribution for cdn.ariacloudservices.org
resource "aws_cloudfront_distribution" "cdn_assets" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "AriaCloud Global Assets & AI Studio CDN (cdn.${var.root_domain})"
  aliases             = ["cdn.${var.root_domain}"]
  price_class         = "PriceClass_All"

  origin {
    domain_name              = aws_s3_bucket.public_assets.bucket_regional_domain_name
    origin_id                = "S3PublicAssets"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3_oac.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3PublicAssets"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.cloudfront_wildcard.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

# CloudFront Distribution for Apex & Wildcard Merchant Sites (*.ariacloudservices.org)
resource "aws_cloudfront_distribution" "merchant_wildcard" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "AriaCloud Apex & Merchant Wildcard Storefronts (${var.root_domain}, *.${var.root_domain})"
  aliases             = [var.root_domain, "*.${var.root_domain}"]
  default_root_object = "index.html"
  price_class         = "PriceClass_All"

  origin {
    domain_name              = aws_s3_bucket.merchant_sites.bucket_regional_domain_name
    origin_id                = "S3MerchantSites"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3_oac.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3MerchantSites"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.merchant_subdomain_router.arn
    }

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.cloudfront_wildcard.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

# Route 53 Master Records: Apex A / AAAA Alias, CDN, and Wildcard Merchant CNAME
resource "aws_route53_record" "apex_a" {
  zone_id = aws_route53_zone.master.zone_id
  name    = var.root_domain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.merchant_wildcard.domain_name
    zone_id                = aws_cloudfront_distribution.merchant_wildcard.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "apex_aaaa" {
  zone_id = aws_route53_zone.master.zone_id
  name    = var.root_domain
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.merchant_wildcard.domain_name
    zone_id                = aws_cloudfront_distribution.merchant_wildcard.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "cdn_cname" {
  zone_id = aws_route53_zone.master.zone_id
  name    = "cdn.${var.root_domain}"
  type    = "CNAME"
  ttl     = 300
  records = [aws_cloudfront_distribution.cdn_assets.domain_name]
}

resource "aws_route53_record" "merchant_wildcard_cname" {
  zone_id = aws_route53_zone.master.zone_id
  name    = "*.${var.root_domain}"
  type    = "CNAME"
  ttl     = 300
  records = [aws_cloudfront_distribution.merchant_wildcard.domain_name]
}
