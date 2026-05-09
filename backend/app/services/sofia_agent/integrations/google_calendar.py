import datetime
import os.path
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from typing import List, Dict, Optional

# If modifying these scopes, delete the file token.json.
SCOPES = ['https://www.googleapis.com/auth/calendar']

class GoogleCalendarClient:
    def __init__(self, credentials_path: str = 'credentials.json', token_data: Optional[Dict] = None):
        self.credentials_path = credentials_path
        self.creds = None
        
        if token_data:
            self.creds = Credentials.from_authorized_user_info(token_data, SCOPES)

    def get_service(self):
        if not self.creds or not self.creds.valid:
            if self.creds and self.creds.expired and self.creds.refresh_token:
                self.creds.refresh(Request())
            else:
                raise Exception("Google Calendar credentials not found or expired. Please run auth script.")
        
        return build('calendar', 'v3', credentials=self.creds)

    async def get_free_busy(self, calendar_id: str, start_time: datetime.datetime, end_time: datetime.datetime):
        service = self.get_service()
        
        body = {
            "timeMin": start_time.isoformat() + 'Z',
            "timeMax": end_time.isoformat() + 'Z',
            "items": [{"id": calendar_id}]
        }
        
        query = service.freebusy().query(body=body).execute()
        return query.get('calendars', {}).get(calendar_id, {}).get('busy', [])

    async def create_event(self, calendar_id: str, summary: str, start_time: str, end_time: str, description: str = ""):
        service = self.get_service()
        
        event = {
            'summary': summary,
            'description': description,
            'start': {
                'dateTime': start_time, # ISO format string with timezone
                'timeZone': 'America/Sao_Paulo',
            },
            'end': {
                'dateTime': end_time,
                'timeZone': 'America/Sao_Paulo',
            },
        }
        
        event = service.events().insert(calendarId=calendar_id, body=event).execute()
        return event

    async def list_upcoming_events(self, calendar_id: str, q: str = None, max_results: int = 10):
        service = self.get_service()
        now = datetime.datetime.utcnow().isoformat() + 'Z'
        
        events_result = service.events().list(
            calendarId=calendar_id, 
            timeMin=now,
            maxResults=max_results, 
            singleEvents=True,
            orderBy='startTime',
            q=q
        ).execute()
        
        return events_result.get('items', [])

    async def delete_event(self, calendar_id: str, event_id: str):
        service = self.get_service()
        service.events().delete(calendarId=calendar_id, eventId=event_id).execute()
        return True
