#!/bin/bash

# Start Next.js Dev Server Script
cd "$(dirname "$0")"

echo "Cleaning .next cache..."
rm -rf .next

echo "Starting Next.js dev server..."
npm run dev

