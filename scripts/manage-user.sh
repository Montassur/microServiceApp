#!/bin/bash

set -euo pipefail

# Default values
EMAIL=""
PASSWORD=""
FIRSTNAME=""
LASTNAME=""
ROLE="user"
DB_USER="auraweb_user"
DB_NAME="auraweb_db"
API_BASE_URL="http://localhost"
BACKEND_CONTAINER=""
DATABASE_CONTAINER=""

# Function to display banner
display_banner() {
  clear
  echo "================================================================"
  echo ""
  echo "           USER MANAGEMENT SYSTEM v2.0"
  echo "           Docker-Based User Administration"
  echo ""
  echo "================================================================"
  echo ""
}

# Function to display main menu
display_main_menu() {
  display_banner
  echo "MAIN MENU:"
  echo ""
  echo "  1) Create New User       - Requires: Email, Name, Password, Role"
  echo "  2) Update Existing User  - Requires: Email, then choose what to update"
  echo "  3) Reset User Password   - Requires: Email, New Password"
  echo "  4) Delete User           - Requires: Email, Type DELETE to confirm"
  echo "  5) List All Users        - No input needed"
  echo "  6) Exit"
  echo ""
  echo "================================================================"
}

# Function to pause and wait for user
pause() {
  echo ""
  read -p "Press Enter to continue..." dummy
}

# Function to validate email format
validate_email() {
  local email="$1"
  if [[ $email =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
    return 0
  else
    return 1
  fi
}

# Function to auto-detect container names
detect_containers() {
  if [ -z "$BACKEND_CONTAINER" ]; then
    echo "Auto-detecting backend container..."
    BACKEND_CONTAINER=$(docker ps --format '{{.Names}}' | grep -E 'database|api' | head -1)
    if [ -z "$BACKEND_CONTAINER" ]; then
      echo "ERROR: Could not auto-detect backend container"
      echo "Available containers:"
      docker ps --format "table {{.Names}}\t{{.Image}}"
      exit 1
    fi
    echo "Found backend: $BACKEND_CONTAINER"
  fi

  if [ -z "$DATABASE_CONTAINER" ]; then
    echo "Auto-detecting database container..."
    DATABASE_CONTAINER=$(docker ps --format '{{.Names}}' | grep -E 'postgres|database|db' | head -1)
    if [ -z "$DATABASE_CONTAINER" ]; then
      echo "ERROR: Could not auto-detect database container"
      echo "Available containers:"
      docker ps --format "table {{.Names}}\t{{.Image}}"
      exit 1
    fi
    echo "Found database: $DATABASE_CONTAINER"
  fi
  echo ""
}

# Function to select role from menu
select_role() {
  echo "" >&2
  echo "SELECT USER ROLE:" >&2
  echo "" >&2
  echo "  1) User   - Regular user with basic permissions" >&2
  echo "  2) Admin  - Full administrative access" >&2
  echo "  3) Editor - Content management permissions" >&2
  echo "" >&2
  
  local choice
  read -p "Enter choice [1-3]: " choice
  
  case "$choice" in
    1|"") echo "user" ;;
    2) echo "admin" ;;
    3) echo "editor" ;;
    *) 
      echo "Invalid choice. Using 'user' as default." >&2
      echo "user"
      ;;
  esac
}

# Function to get email
get_email() {
  local email=""
  while [ -z "$email" ] || ! validate_email "$email"; do
    read -p "Email Address: " email
    if ! validate_email "$email"; then
      echo "ERROR: Invalid email format. Please try again." >&2
      email=""
    fi
  done
  echo "$email"
}

# Function to get password
get_password() {
  local password=""
  local confirm=""
  
  while [ -z "$password" ]; do
    read -sp "Password: " password
    echo "" >&2
    
    if [ -z "$password" ]; then
      echo "ERROR: Password cannot be empty." >&2
      continue
    fi
    
    read -sp "Confirm Password: " confirm
    echo "" >&2
    
    if [ "$password" != "$confirm" ]; then
      echo "ERROR: Passwords do not match. Please try again." >&2
      password=""
    fi
  done
  
  echo "$password"
}

# Function to create new user
create_user() {
  display_banner
  echo "=== CREATE NEW USER ==="
  echo ""
  echo "Please provide the following information:"
  echo ""
  
  EMAIL=$(get_email)
  
  read -p "First Name: " FIRSTNAME
  read -p "Last Name: " LASTNAME
  
  echo ""
  PASSWORD=$(get_password)
  
  ROLE=$(select_role)
  
  echo ""
  echo "=== SUMMARY ==="
  echo "  Email:      $EMAIL"
  echo "  Name:       $FIRSTNAME $LASTNAME"
  echo "  Role:       $ROLE"
  echo "  Password:   ********"
  echo ""
  
  read -p "Create this user? [y/N]: " confirm
  
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "User creation cancelled."
    pause
    return
  fi
  
  perform_user_operation "create"
}

# Function to update user
update_user() {
  display_banner
  echo "=== UPDATE USER ==="
  echo ""
  echo "Enter the email of the user to update:"
  echo ""
  
  EMAIL=$(get_email)
  
  # Check if user exists
  echo ""
  echo "Checking if user exists..."
  USER_EXISTS=$(docker exec "$DATABASE_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" -t \
    -c "SELECT COUNT(*) FROM users WHERE email='$EMAIL';" 2>&1 | tr -d ' ')
  
  if [ "$USER_EXISTS" -eq 0 ]; then
    echo "ERROR: User not found: $EMAIL"
    pause
    return
  fi
  
  echo "User found!"
  echo ""
  
  # Show current user details
  echo "CURRENT USER DETAILS:"
  docker exec "$DATABASE_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" \
    -c "SELECT email, first_name, last_name, role FROM users WHERE email='$EMAIL';"
  echo ""
  
  echo "What would you like to update?"
  echo "(Press Enter to skip any field you don't want to change)"
  echo ""
  
  read -p "New First Name (or press Enter to keep current): " FIRSTNAME
  read -p "New Last Name (or press Enter to keep current): " LASTNAME
  
  echo ""
  read -p "Update role? [y/N]: " update_role
  
  if [[ "$update_role" =~ ^[Yy]$ ]]; then
    ROLE=$(select_role)
  else
    ROLE=""
  fi
  
  echo ""
  read -p "Update password? [y/N]: " update_pass
  
  if [[ "$update_pass" =~ ^[Yy]$ ]]; then
    echo ""
    PASSWORD=$(get_password)
  else
    PASSWORD=""
  fi
  
  # Check if anything was changed
  if [ -z "$FIRSTNAME" ] && [ -z "$LASTNAME" ] && [ -z "$ROLE" ] && [ -z "$PASSWORD" ]; then
    echo ""
    echo "No changes specified. Update cancelled."
    pause
    return
  fi
  
  # Show summary of changes
  echo ""
  echo "=== CHANGES SUMMARY ==="
  echo "  User: $EMAIL"
  [ -n "$FIRSTNAME" ] && echo "  New First Name: $FIRSTNAME"
  [ -n "$LASTNAME" ] && echo "  New Last Name: $LASTNAME"
  [ -n "$ROLE" ] && echo "  New Role: $ROLE"
  [ -n "$PASSWORD" ] && echo "  Password: Will be updated"
  echo ""
  
  read -p "Apply these changes? [y/N]: " confirm
  
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Update cancelled."
    pause
    return
  fi
  
  perform_user_operation "update"
}

# Function to reset password
reset_password() {
  display_banner
  echo "=== RESET USER PASSWORD ==="
  echo ""
  echo "Enter the email of the user whose password you want to reset:"
  echo ""
  
  EMAIL=$(get_email)
  
  # Check if user exists
  echo ""
  echo "Checking if user exists..."
  USER_EXISTS=$(docker exec "$DATABASE_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" -t \
    -c "SELECT COUNT(*) FROM users WHERE email='$EMAIL';" 2>&1 | tr -d ' ')
  
  if [ "$USER_EXISTS" -eq 0 ]; then
    echo "ERROR: User not found: $EMAIL"
    pause
    return
  fi
  
  echo "User found!"
  echo ""
  echo "Enter the new password:"
  echo ""
  
  PASSWORD=$(get_password)
  
  echo ""
  echo "=== SUMMARY ==="
  echo "  User:     $EMAIL"
  echo "  Action:   Reset password"
  echo ""
  
  read -p "Reset password for this user? [y/N]: " confirm
  
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Password reset cancelled."
    pause
    return
  fi
  
  perform_user_operation "reset_password"
}

# Function to delete user
delete_user() {
  display_banner
  echo "=== DELETE USER ==="
  echo ""
  echo "Enter the email of the user to delete:"
  echo ""
  
  EMAIL=$(get_email)
  
  # Check if user exists and show details
  echo ""
  echo "Checking if user exists..."
  USER_EXISTS=$(docker exec "$DATABASE_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" -t \
    -c "SELECT COUNT(*) FROM users WHERE email='$EMAIL';" 2>&1 | tr -d ' ')
  
  if [ "$USER_EXISTS" -eq 0 ]; then
    echo "ERROR: User not found: $EMAIL"
    pause
    return
  fi
  
  echo "User found!"
  echo ""
  
  echo "USER DETAILS:"
  docker exec "$DATABASE_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" \
    -c "SELECT email, first_name, last_name, role, created_at FROM users WHERE email='$EMAIL';"
  echo ""
  
  echo "WARNING: This action CANNOT be undone!"
  echo "WARNING: All user data will be permanently deleted!"
  echo ""
  echo "To confirm deletion, type DELETE (in uppercase):"
  read -p "Confirmation: " confirm
  
  if [ "$confirm" != "DELETE" ]; then
    echo ""
    echo "Deletion cancelled (confirmation did not match)."
    pause
    return
  fi
  
  perform_user_operation "delete"
}

# Function to list all users
list_users() {
  display_banner
  echo "=== ALL USERS ==="
  echo ""
  
  docker exec "$DATABASE_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" \
    -c "SELECT id, email, first_name, last_name, role, created_at FROM users ORDER BY created_at DESC;"
  
  pause
}

# Function to perform user operations
perform_user_operation() {
  local operation="$1"
  
  echo ""
  echo "Processing..."
  echo ""
  
  case "$operation" in
    create)
      # Generate password hash
      echo "Generating password hash..."
      echo "Using backend container: $BACKEND_CONTAINER"
      
      HASH=$(docker exec "$BACKEND_CONTAINER" node -e "
const bcrypt = require('bcrypt');
bcrypt.hash('$PASSWORD', 12, (err, hash) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  console.log(hash);
  process.exit(0);
});
" 2>&1 | tail -1) || {
        echo "ERROR: Docker exec command failed"
        echo "Backend container: $BACKEND_CONTAINER"
        echo "Please ensure the backend container is running and has bcrypt installed"
        pause
        return
      }
      
      if [ -z "$HASH" ] || [[ "$HASH" == *"Error"* ]]; then
        echo "ERROR: Failed to generate password hash"
        echo "Output: $HASH"
        pause
        return
      fi
      
      echo "Password hash generated successfully"
      
      # Insert user
      echo "Creating user..."
      RESULT=$(docker exec "$DATABASE_CONTAINER" \
        psql -U "$DB_USER" -d "$DB_NAME" \
        -c "INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES ('$EMAIL', '$HASH', '$FIRSTNAME', '$LASTNAME', '$ROLE') RETURNING id;" 2>&1)
      
      if echo "$RESULT" | grep -q "ERROR"; then
        echo "ERROR: Failed to create user"
        echo "$RESULT"
      else
        echo "SUCCESS: User created successfully!"
        echo ""
        echo "User Details:"
        echo "  Email: $EMAIL"
        echo "  Name: $FIRSTNAME $LASTNAME"
        echo "  Role: $ROLE"
      fi
      ;;
      
    update)
      # Build update query
      UPDATE_PARTS=()
      
      if [ -n "$PASSWORD" ]; then
        echo "Generating password hash..."
        echo "Using backend container: $BACKEND_CONTAINER"
        
        HASH=$(docker exec "$BACKEND_CONTAINER" node -e "
const bcrypt = require('bcrypt');
bcrypt.hash('$PASSWORD', 12, (err, hash) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  console.log(hash);
  process.exit(0);
});
" 2>&1 | tail -1) || {
          echo "ERROR: Docker exec command failed"
          echo "Backend container: $BACKEND_CONTAINER"
          pause
          return
        }
        
        if [ -z "$HASH" ] || [[ "$HASH" == *"Error"* ]]; then
          echo "ERROR: Failed to generate password hash"
          echo "Output: $HASH"
          pause
          return
        fi
        
        UPDATE_PARTS+=("password_hash='$HASH'")
      fi
      
      [ -n "$FIRSTNAME" ] && UPDATE_PARTS+=("first_name='$FIRSTNAME'")
      [ -n "$LASTNAME" ] && UPDATE_PARTS+=("last_name='$LASTNAME'")
      [ -n "$ROLE" ] && UPDATE_PARTS+=("role='$ROLE'")
      UPDATE_PARTS+=("updated_at=NOW()")
      
      UPDATE_SQL=$(IFS=,; echo "${UPDATE_PARTS[*]}")
      
      echo "Updating user..."
      RESULT=$(docker exec "$DATABASE_CONTAINER" \
        psql -U "$DB_USER" -d "$DB_NAME" \
        -c "UPDATE users SET $UPDATE_SQL WHERE email='$EMAIL';" 2>&1)
      
      if echo "$RESULT" | grep -q "ERROR"; then
        echo "ERROR: Failed to update user"
        echo "$RESULT"
      else
        echo "SUCCESS: User updated successfully!"
      fi
      ;;
      
    reset_password)
      echo "Generating password hash..."
      echo "Using backend container: $BACKEND_CONTAINER"
      
      HASH=$(docker exec "$BACKEND_CONTAINER" node -e "
const bcrypt = require('bcrypt');
bcrypt.hash('$PASSWORD', 12, (err, hash) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  console.log(hash);
  process.exit(0);
});
" 2>&1 | tail -1) || {
        echo "ERROR: Docker exec command failed"
        echo "Backend container: $BACKEND_CONTAINER"
        pause
        return
      }
      
      if [ -z "$HASH" ] || [[ "$HASH" == *"Error"* ]]; then
        echo "ERROR: Failed to generate password hash"
        echo "Output: $HASH"
        pause
        return
      fi
      
      echo "Resetting password..."
      RESULT=$(docker exec "$DATABASE_CONTAINER" \
        psql -U "$DB_USER" -d "$DB_NAME" \
        -c "UPDATE users SET password_hash='$HASH', updated_at=NOW() WHERE email='$EMAIL';" 2>&1)
      
      if echo "$RESULT" | grep -q "ERROR"; then
        echo "ERROR: Failed to reset password"
        echo "$RESULT"
      else
        echo "SUCCESS: Password reset successfully!"
      fi
      ;;
      
    delete)
      echo "Deleting user..."
      RESULT=$(docker exec "$DATABASE_CONTAINER" \
        psql -U "$DB_USER" -d "$DB_NAME" \
        -c "DELETE FROM users WHERE email='$EMAIL';" 2>&1)
      
      if echo "$RESULT" | grep -q "ERROR"; then
        echo "ERROR: Failed to delete user"
        echo "$RESULT"
      else
        echo "SUCCESS: User deleted successfully!"
      fi
      ;;
  esac
  
  pause
}

# Main execution
main() {
  # Auto-detect containers
  detect_containers
  
  while true; do
    display_main_menu
    
    read -p "Enter your choice [1-6]: " choice
    
    case "$choice" in
      1) create_user ;;
      2) update_user ;;
      3) reset_password ;;
      4) delete_user ;;
      5) list_users ;;
      6) 
        echo ""
        echo "Thank you for using User Management System!"
        echo ""
        exit 0
        ;;
      *)
        echo "ERROR: Invalid choice. Please try again."
        sleep 2
        ;;
    esac
  done
}

# Run main function
main
