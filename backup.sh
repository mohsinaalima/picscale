#!/bin/bash

# 1. Define where the files are and where they are going
SOURCE="uploads"
DESTINATION="backup"

# 2. Get the current date and time for the log
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")

echo "Starting backup at $TIMESTAMP..."

# 3. Check if the uploads folder is empty
# 'ls -A' lists all files. We check if the output is empty.
if [ "$(ls -A $SOURCE)" ]; then
    echo "Files found! Moving to $DESTINATION..."
    
    # 4. The Move Command
    # We move everything from source to destination
    mv $SOURCE/* $DESTINATION/
    
    echo "Success: Files have been moved."
else
    echo "Notice: Uploads folder is empty. No files to move."
fi

echo "Backup process finished."