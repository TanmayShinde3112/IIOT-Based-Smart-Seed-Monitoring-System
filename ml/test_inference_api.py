"""
Quick local test for seed prediction endpoint.

Usage:
  python ml/test_inference_api.py --image "path/to/seed.jpg"
"""

import argparse
from pathlib import Path

import requests


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", type=str, required=True)
    parser.add_argument("--username", type=str, default="admin")
    parser.add_argument("--password", type=str, default="admin123")
    parser.add_argument("--base", type=str, default="http://localhost:8000")
    args = parser.parse_args()

    login = requests.post(
        f"{args.base}/api/auth/login",
        json={"username": args.username, "password": args.password},
        timeout=30,
    )
    login.raise_for_status()
    token = login.json()["access_token"]

    image_path = Path(args.image)
    with image_path.open("rb") as fh:
        resp = requests.post(
            f"{args.base}/api/seeds/predict-seed",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": (image_path.name, fh, "image/jpeg")},
            timeout=60,
        )
    resp.raise_for_status()
    print(resp.json())


if __name__ == "__main__":
    main()
