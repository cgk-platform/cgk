#!/usr/bin/env bash
set -e

# Video Remix - Analyze source video and generate new one with modifications
# Supports two modes:
#   TEXT mode (default): analyze -> text prompt -> text-to-video
#   IMAGE mode (--image-remix): analyze -> extract frame -> remix image -> image-to-video
#
# Usage:
#   ./remix_video.sh <video_path_or_url> "modifications" [backend]
#   ./remix_video.sh --image-remix <video_path_or_url> "image remix prompt" [backend]
#   ./remix_video.sh --image-remix --input-image /path/to/image.png <video_path_or_url> "image remix prompt" [backend]

IMAGE_REMIX=false
INPUT_IMAGE=""

# Parse flags
while [[ "$1" == --* ]]; do
    case "$1" in
        --image-remix)
            IMAGE_REMIX=true
            shift
            ;;
        --input-image)
            INPUT_IMAGE="$2"
            shift 2
            ;;
        *)
            echo "Unknown flag: $1"
            exit 1
            ;;
    esac
done

VIDEO="$1"
MODIFICATIONS="${2:-keep same style and content}"
BACKEND="${3:-veo-fast}"

if [ -z "$VIDEO" ]; then
    echo "Error: No video provided"
    echo ""
    echo "Usage:"
    echo "  Text mode:  $0 <video_path_or_url> \"modifications\" [backend]"
    echo "  Image mode: $0 --image-remix <video_path_or_url> \"image remix prompt\" [backend]"
    echo "  With image: $0 --image-remix --input-image /path/to/screenshot.png <video_path_or_url> \"prompt\" [backend]"
    echo "  Backends: veo-fast|veo-quality|vertex-veo-fast|vertex-veo-quality|kling-pro|kling-std|sora"
    exit 1
fi

TIMESTAMP=$(date +%Y-%m-%d-%H-%M-%S)
# Derive profile root from script location: <root>/skills/video-remix/scripts/remix_video.sh
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROFILE_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
MEDIA_DIR="${PROFILE_ROOT}/media"
ANALYSIS_FILE="${MEDIA_DIR}/${TIMESTAMP}-analysis.json"
OUTPUT_VIDEO="${MEDIA_DIR}/${TIMESTAMP}-remix.mp4"
FRAME_FILE="${MEDIA_DIR}/${TIMESTAMP}-frame.png"
REMIXED_IMAGE="${MEDIA_DIR}/${TIMESTAMP}-remixed.png"

if [ "$IMAGE_REMIX" = true ]; then
    echo "=== VIDEO CLONE & REMIX WORKFLOW (Image Mode) ==="
else
    echo "=== VIDEO REMIX WORKFLOW (Text Mode) ==="
fi
echo "Source: $VIDEO"
echo "Modifications: $MODIFICATIONS"
echo "Backend: $BACKEND"
if [ -n "$INPUT_IMAGE" ]; then
    echo "Input Image: $INPUT_IMAGE"
fi
echo ""

# Step 1: Analyze video (with frame extraction in image mode)
echo "STEP 1: Analyzing source video..."
ANALYZE_ARGS=(
    --video "$VIDEO"
    --modifications "$MODIFICATIONS"
    --output "$ANALYSIS_FILE"
)
if [ "$IMAGE_REMIX" = true ] && [ -z "$INPUT_IMAGE" ]; then
    ANALYZE_ARGS+=(--extract-frame "$FRAME_FILE")
fi

uv run "${PROFILE_ROOT}/skills/video-remix/scripts/analyze_video.py" "${ANALYZE_ARGS[@]}"

# Extract prompt from JSON
PROMPT=$(python3 -c "import sys, json; print(json.load(sys.stdin)['veo_sora_prompt'])" < "$ANALYSIS_FILE")

echo ""

if [ "$IMAGE_REMIX" = true ]; then
    # IMAGE MODE: extract frame -> remix with nano banana -> image-to-video

    # Determine source image (user-provided or extracted frame)
    if [ -n "$INPUT_IMAGE" ]; then
        SOURCE_IMAGE="$INPUT_IMAGE"
        echo "STEP 2: Using provided image: $SOURCE_IMAGE"
    elif [ -f "$FRAME_FILE" ]; then
        SOURCE_IMAGE="$FRAME_FILE"
        echo "STEP 2: Using extracted frame: $SOURCE_IMAGE"
    else
        echo "Error: No source image available. Provide --input-image or ensure ffmpeg is installed for frame extraction."
        exit 1
    fi

    # Step 3: Remix image with Nano Banana
    echo ""
    echo "STEP 3: Remixing image with Nano Banana..."
    echo "Prompt: $MODIFICATIONS"
    uv run "${PROFILE_ROOT}/skills/nano-banana-pro/scripts/generate_image.py" \
        --prompt "$MODIFICATIONS" \
        --input-image "$SOURCE_IMAGE" \
        --filename "$REMIXED_IMAGE" \
        --aspect-ratio 9:16

    echo ""
    echo "STEP 4: Generating video from remixed image..."
    echo "Video prompt: $PROMPT"

    # Step 4: Image-to-video with the remixed image
    uv run "${PROFILE_ROOT}/skills/veo-video-gen/scripts/generate_video.py" \
        --prompt "$PROMPT" \
        --reference-image "$REMIXED_IMAGE" \
        --filename "$OUTPUT_VIDEO" \
        --aspect-ratio 9:16 \
        --duration 8 \
        --backend "$BACKEND"

    echo ""
    echo "=== COMPLETE (Image Remix Mode) ==="
    echo "Analysis:      $ANALYSIS_FILE"
    [ -f "$FRAME_FILE" ] && echo "Extracted Frame: $FRAME_FILE"
    echo "Remixed Image: $REMIXED_IMAGE"
    echo "Output Video:  $OUTPUT_VIDEO"
else
    # TEXT MODE: original behavior -- text prompt -> text-to-video
    echo "STEP 2: Generating new video with prompt..."
    echo "Prompt: $PROMPT"
    echo ""

    uv run "${PROFILE_ROOT}/skills/veo-video-gen/scripts/generate_video.py" \
        --prompt "$PROMPT" \
        --filename "$OUTPUT_VIDEO" \
        --aspect-ratio 9:16 \
        --backend "$BACKEND"

    echo ""
    echo "=== COMPLETE (Text Mode) ==="
    echo "Analysis: $ANALYSIS_FILE"
    echo "Video:    $OUTPUT_VIDEO"
fi
