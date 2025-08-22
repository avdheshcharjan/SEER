#!/bin/bash

# Testing workflow script for local development

echo "🧪 BASED Testing Workflow"
echo "========================="

# Function to reset test data
reset_data() {
    echo "🗑️ Clearing test data..."
    # You can run the SQL reset script here
    echo "Run the reset-test-data.sql script in Supabase SQL editor"
    echo "Or use: supabase db reset (if using local Supabase)"
}

# Function to check current data
check_data() {
    echo "📊 Current test data:"
    echo "Check user_predictions and user_positions tables in Supabase dashboard"
}

# Function to start fresh test
start_test() {
    echo "🚀 Starting fresh test session..."
    echo "1. Reset your test data first"
    echo "2. Restart your local dev server: npm run dev"
    echo "3. Clear browser cache/localStorage"
    echo "4. Use different test wallet if needed"
}

case "$1" in
    "reset")
        reset_data
        ;;
    "check")
        check_data
        ;;
    "start")
        start_test
        ;;
    *)
        echo "Usage: $0 {reset|check|start}"
        echo ""
        echo "Commands:"
        echo "  reset  - Clear test data from database"
        echo "  check  - Check current test data"
        echo "  start  - Start fresh test session"
        ;;
esac