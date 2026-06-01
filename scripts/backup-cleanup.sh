#!/bin/bash
# Database Backup Cleanup Script
# Maintains backup retention policy and provides backup management utilities

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backup}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
BACKUP_PATTERN="db-*.sql.gz"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to list all backups
list_backups() {
    log_info "Current backups in $BACKUP_DIR:"
    if ls $BACKUP_DIR/$BACKUP_PATTERN 1> /dev/null 2>&1; then
        ls -lh $BACKUP_DIR/$BACKUP_PATTERN
        
        # Calculate total size
        TOTAL_SIZE=$(du -sh $BACKUP_DIR | cut -f1)
        log_info "Total backup size: $TOTAL_SIZE"
    else
        log_warn "No backups found"
    fi
}

# Function to cleanup old backups
cleanup_old_backups() {
    log_info "Cleaning up backups older than $RETENTION_DAYS days..."
    
    DELETED_COUNT=0
    while IFS= read -r file; do
        log_info "Deleting old backup: $(basename $file)"
        rm -f "$file"
        ((DELETED_COUNT++))
    done < <(find $BACKUP_DIR -name "$BACKUP_PATTERN" -type f -mtime +$RETENTION_DAYS)
    
    if [ $DELETED_COUNT -eq 0 ]; then
        log_info "No old backups to delete"
    else
        log_info "Deleted $DELETED_COUNT old backup(s)"
    fi
}

# Function to verify backup integrity
verify_backup() {
    local backup_file=$1
    
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        return 1
    fi
    
    log_info "Verifying backup: $(basename $backup_file)"
    
    # Check if file is a valid gzip file
    if gzip -t "$backup_file" 2>/dev/null; then
        log_info "✓ Backup file is valid"
        
        # Show file size
        SIZE=$(du -h "$backup_file" | cut -f1)
        log_info "  Size: $SIZE"
        
        # Show file age
        AGE=$(find "$backup_file" -mtime 0 -printf "%Tc\n")
        log_info "  Created: $AGE"
        
        return 0
    else
        log_error "✗ Backup file is corrupted or invalid"
        return 1
    fi
}

# Function to get latest backup
get_latest_backup() {
    LATEST=$(ls -t $BACKUP_DIR/$BACKUP_PATTERN 2>/dev/null | head -1)
    
    if [ -n "$LATEST" ]; then
        echo "$LATEST"
        return 0
    else
        log_error "No backups found"
        return 1
    fi
}

# Main script
case "${1:-list}" in
    list)
        list_backups
        ;;
    cleanup)
        cleanup_old_backups
        list_backups
        ;;
    verify)
        if [ -n "$2" ]; then
            verify_backup "$2"
        else
            # Verify latest backup
            LATEST=$(get_latest_backup)
            if [ $? -eq 0 ]; then
                verify_backup "$LATEST"
            fi
        fi
        ;;
    latest)
        LATEST=$(get_latest_backup)
        if [ $? -eq 0 ]; then
            log_info "Latest backup: $(basename $LATEST)"
            verify_backup "$LATEST"
        fi
        ;;
    help)
        echo "Database Backup Management Script"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  list              List all backups (default)"
        echo "  cleanup           Remove backups older than retention period"
        echo "  verify [file]     Verify backup integrity (latest if no file specified)"
        echo "  latest            Show and verify latest backup"
        echo "  help              Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  BACKUP_DIR        Backup directory (default: /backup)"
        echo "  RETENTION_DAYS    Days to keep backups (default: 7)"
        ;;
    *)
        log_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
