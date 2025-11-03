import copy
from urllib.parse import quote

import pytest
from fastapi.testclient import TestClient

import src.app as app_module


INITIAL_ACTIVITIES = copy.deepcopy(app_module.activities)


@pytest.fixture(autouse=True)
def reset_activities():
    # Restore the in-memory activities before each test
    app_module.activities.clear()
    app_module.activities.update(copy.deepcopy(INITIAL_ACTIVITIES))
    yield


@pytest.fixture
def client():
    with TestClient(app_module.app) as c:
        yield c


def test_root_redirect(client):
    res = client.get("/", follow_redirects=False)
    assert res.status_code in (301, 302, 307)
    assert res.headers.get("location") == "/static/index.html"


def test_get_activities(client):
    res = client.get("/activities")
    assert res.status_code == 200
    data = res.json()
    assert "Chess Club" in data
    assert isinstance(data["Chess Club"]["participants"], list)


def test_signup_and_see_participant(client):
    activity = "Chess Club"
    email = "newstudent@mergington.edu"

    res = client.post(f"/activities/{quote(activity)}/signup", params={"email": email})
    assert res.status_code == 200
    assert email in res.json().get("message", "")

    # confirm participant appears in activities
    res2 = client.get("/activities")
    assert res2.status_code == 200
    participants = res2.json()[activity]["participants"]
    assert email in participants


def test_signup_already_signed(client):
    activity = "Chess Club"
    existing = INITIAL_ACTIVITIES[activity]["participants"][0]

    res = client.post(f"/activities/{quote(activity)}/signup", params={"email": existing})
    assert res.status_code == 400


def test_unregister_participant(client):
    activity = "Programming Class"
    existing = INITIAL_ACTIVITIES[activity]["participants"][0]

    res = client.post(f"/activities/{quote(activity)}/unregister", params={"email": existing})
    assert res.status_code == 200

    # ensure participant removed
    res2 = client.get("/activities")
    assert existing not in res2.json()[activity]["participants"]


def test_unregister_not_signed(client):
    activity = "Programming Class"
    not_signed = "nobody@mergington.edu"

    res = client.post(f"/activities/{quote(activity)}/unregister", params={"email": not_signed})
    assert res.status_code == 400
