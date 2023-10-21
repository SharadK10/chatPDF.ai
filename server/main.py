from fastapi import FastAPI
from pdf_handler import router
from fastapi.middleware.cors import CORSMiddleware
from decouple import config

app = FastAPI()

REACT_APP_URL = config('REACT_APP_URL')
SERVER_URL = config('SERVER_URL')

# Configure CORS settings
origins = [
        SERVER_URL,
        REACT_APP_URL,
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)