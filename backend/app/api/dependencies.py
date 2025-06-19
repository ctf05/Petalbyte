# backend/app/api/dependencies.py
from fastapi import APIRouter, HTTPException
from typing import List

from ..models import DependencyInfo
from ..dependencies import get_all_dependencies, get_dependency_by_name

router = APIRouter()

@router.get("", response_model=List[DependencyInfo])
async def check_all_dependencies():
    """Check all system dependencies"""
    dependencies = get_all_dependencies()
    results = []

    for dep in dependencies:
        info = await dep.get_info()
        results.append(info)

    return results

@router.get("/{name}", response_model=DependencyInfo)
async def check_dependency(name: str):
    """Check a specific dependency"""
    try:
        dep = get_dependency_by_name(name)
        return await dep.get_info()
    except ValueError:
        raise HTTPException(status_code=404, detail=f"Dependency '{name}' not found")

@router.post("/{name}/fix")
async def fix_dependency(name: str):
    """Attempt to fix a specific dependency"""
    try:
        dep = get_dependency_by_name(name)

        # Check current status
        info = await dep.get_info()
        if info.status == "ok":
            return {"success": True, "message": "Dependency already satisfied"}

        if not info.can_fix:
            return {"success": False, "message": "This dependency cannot be automatically fixed"}

        # Attempt fix
        result = await dep.fix()

        # Re-check status
        new_info = await dep.get_info()
        result["new_status"] = new_info.status

        return result

    except ValueError:
        raise HTTPException(status_code=404, detail=f"Dependency '{name}' not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))