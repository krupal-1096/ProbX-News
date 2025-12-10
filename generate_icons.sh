#!/bin/bash

SOURCE="assets/imgs/logo_only.png"
RES_DIR="android/app/src/main/res"

# Define sizes
declare -A sizes=( ["mdpi"]=48 ["hdpi"]=72 ["xhdpi"]=96 ["xxhdpi"]=144 ["xxxhdpi"]=192 )

for density in "${!sizes[@]}"; do
  size=${sizes[$density]}
  target_dir="$RES_DIR/mipmap-$density"
  
  echo "Generating $density ($size x $size)..."
  
  # Generate square icon
  convert "$SOURCE" -resize ${size}x${size} "$target_dir/ic_launcher.png"
  
  # Generate round icon (just resizing for now, proper round crop would be better but simple resize is safe)
  convert "$SOURCE" -resize ${size}x${size} "$target_dir/ic_launcher_round.png"
done

echo "Icons updated successfully."
