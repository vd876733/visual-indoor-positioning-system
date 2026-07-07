from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse

app = FastAPI(title="AI Blueprint Service", version="1.0.0")


@app.post("/api/ai/generate-blueprint")
async def generate_blueprint(image: UploadFile = File(...)):
    """Mock blueprint generation endpoint for indoor layout processing."""
    return {
        "canvas": {
            "width": 1200,
            "height": 800
        },
        "rooms": [
            {
                "name": "Living Room",
                "bbox": {"x": 80, "y": 80, "width": 320, "height": 260}
            },
            {
                "name": "Kitchen",
                "bbox": {"x": 430, "y": 90, "width": 280, "height": 220}
            },
            {
                "name": "Bedroom",
                "bbox": {"x": 760, "y": 120, "width": 260, "height": 280}
            }
        ]
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
