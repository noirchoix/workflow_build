from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from routers.workflow import router as workflow_router

app = FastAPI(title='AI Workflow Builder API', version='1.0.0')
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)
app.include_router(workflow_router)


@app.get('/')
def root():
    return {'ok': True, 'service': settings.app_name}
