from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
import uvicorn

app = FastAPI(title="Blueprint AI Service", version="1.0.0")


@app.post("/api/blueprint/generate")
async def generate_blueprint(image: UploadFile = File(...)):
    """Mock blueprint generation endpoint for indoor layout parsing."""
    return [
        {
            "name": "Living Room",
            "x": 40,
            "y": 40,
            "width": 280,
            "height": 220
        },
        {
            "name": "Bedroom",
            "x": 360,
            "y": 80,
            "width": 180,
            "height": 180
        },
        {
            "name": "Kitchen",
            "x": 560,
            "y": 260,
            "width": 180,
            "height": 140
        }
    ]


if __name__ == "__main__":
    uvicorn.run("blueprint_service:app", host="0.0.0.0", port=8000, reload=True)
