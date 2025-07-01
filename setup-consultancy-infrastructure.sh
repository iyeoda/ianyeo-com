#!/bin/bash

# AI Consultancy Infrastructure Setup Script
# Run this script to create the necessary Cloudflare resources

echo "🚀 Setting up AI Consultancy Infrastructure..."

# Create KV Namespaces
echo "📦 Creating KV Namespaces..."

echo "Creating LEADS_DB namespace..."
wrangler kv:namespace create LEADS_DB
echo "Creating LEADS_DB preview namespace..."
wrangler kv:namespace create LEADS_DB --preview

echo "Creating ASSESSMENTS_DB namespace..."
wrangler kv:namespace create ASSESSMENTS_DB
echo "Creating ASSESSMENTS_DB preview namespace..."
wrangler kv:namespace create ASSESSMENTS_DB --preview

echo "Creating ANALYTICS_DB namespace..."
wrangler kv:namespace create ANALYTICS_DB
echo "Creating ANALYTICS_DB preview namespace..."
wrangler kv:namespace create ANALYTICS_DB --preview

# Create R2 Buckets
echo "🗂️ Creating R2 Buckets..."

echo "Creating lead-magnets bucket..."
wrangler r2 bucket create lead-magnets

echo "Creating lead-magnets-preview bucket..."
wrangler r2 bucket create lead-magnets-preview

# Set secrets
echo "🔐 Setting up secrets..."
echo "You'll need to set the following secrets manually:"
echo ""
echo "wrangler secret put HUBSPOT_API_KEY"
echo "wrangler secret put CALENDLY_API_KEY" 
echo "wrangler secret put POSTMARK_API_KEY"
echo "wrangler secret put GA4_MEASUREMENT_ID"
echo "wrangler secret put GA4_API_SECRET"
echo ""
echo "⚠️  Important: Update the namespace IDs in wrangler.toml with the IDs generated above!"
echo ""
echo "✅ Infrastructure setup complete!"
echo "Next steps:"
echo "1. Update wrangler.toml with the generated namespace IDs"
echo "2. Set the required secrets using the commands above"
echo "3. Deploy the worker with: wrangler deploy" 