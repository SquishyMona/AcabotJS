import { google } from 'googleapis';
import Firestore from '@google-cloud/firestore';
import { eventInsert } from './eventInsert.js';
import RRule from 'rrule';

const RecurrenceFrequency = ['YEARLY', 'MONTHLY', 'WEEKLY', 'DAILY'];
const RecurrenceWeekday = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

export const syncAllEvents = async (calendarId, scheduledEventManager, sendDiscordToGCal) => {
    const scheduledEvents = await JSON.parse(JSON.stringify(scheduledEventManager.cache));
    console.log(`Scheduled Events: ${scheduledEvents}`);
    const auth = new google.auth.GoogleAuth({
		keyFile: `${process.cwd()}/cloud/serviceaccount.json`,
		scopes: ['https://www.googleapis.com/auth/calendar'],
	});
	const calendar = google.calendar({ version: 'v3', auth });
    const db = new Firestore.Firestore({ projectId: 'acabotjs', keyFilename: `${process.cwd()}/cloud/serviceaccount.json` });
    const doc = await db.collection('discordevents').doc(scheduledEventManager.guild.id).get();
    const firestoreEvents = doc.data().events;
    const results = await calendar.events.list({
        calendarId,
        timeMin: new Date().toISOString(),
    });

    const events = results.data.items;

    for await (const event of events) {
        let googleStart = event.start.dateTime ? new Date(event.start.dateTime).toISOString() : new Date(`${event.start.date}T00:00:00-05:00`);
        let googleEnd = event.start.dateTime ? new Date(event.end.dateTime).toISOString() : new Date(`${event.end.date}T00:00:00-05:00`);
        let newRecurrenceRule;
        if (event.recurrence) {
            newRecurrenceRule = await parseRecurrenceRule(event.recurrence[0].split(':')[1], googleStart, calendar, calendarId, event.id);
        }
        if (newRecurrenceRule === false || newRecurrenceRule.startAt === undefined) {
            console.log(`Event ${event.summary} has no future occurrences`);
            continue;
        } else {
            const originalStart = googleStart;
            googleStart = newRecurrenceRule.startAt.toISOString();
            googleEnd = new Date(new Date(googleStart).getTime() + new Date(googleEnd).getTime() - new Date(originalStart).getTime()).toISOString();
        }

        const scheduledEvent = scheduledEvents.find((scheduledEvent) => {
            console.log(`Google Start: ${googleStart.slice(0, -5)} vs Scheduled Start: ${new Date(scheduledEvent.scheduledStartTimestamp).toISOString().slice(0, -5)}`);
            console.log(`Google End: ${googleEnd.slice(0, -5)} vs Scheduled End: ${new Date(scheduledEvent.scheduledEndTimestamp).toISOString().slice(0, -5)}`);
            const googleDescription = event.description ?? null;
            const googleLocation = event.location ?? 'No Location Provided';
            const discordDescription = scheduledEvent.description === '' || scheduledEvent.description === undefined ? null : scheduledEvent.description;
            if (scheduledEvent.name === event.summary &&
                scheduledEvent.entityMetadata.location === googleLocation &&
                discordDescription === googleDescription &&
               new Date(scheduledEvent.scheduledStartTimestamp).toISOString().slice(0, -5) === googleStart.slice(0, -5) &&
               new Date(scheduledEvent.scheduledEndTimestamp).toISOString().slice(0, -5) === googleEnd.slice(0, -5)
               ) return true;
            else return false;
        });
        console.log(`Matching Scheduled Event: ${scheduledEvent}`);


        if (!scheduledEvent) {
            try {
                let startTime = newRecurrenceRule ? new Date(newRecurrenceRule.startAt).toISOString() : new Date(googleStart).toISOString();
                let endTime = newRecurrenceRule ? new Date(new Date(startTime).getTime() + new Date(googleEnd).getTime() - new Date(googleStart).getTime()).toISOString() : new Date(googleEnd).toISOString();
        
                const newScheduledEvent = await scheduledEventManager.create({
                    name: event.summary,
                    description: event.description ?? null,
                    scheduledStartTime: startTime,
                    scheduledEndTime: endTime,
                    entityMetadata: { location: event.location ?? 'No Location Provided' },
                    entityType: 3,
                    privacyLevel: 2,
                    recurrenceRule: newRecurrenceRule || undefined,
                });
        
                firestoreEvents.push({ googleId: event.id, discordId: newScheduledEvent.id, calendarId, needsUpdate: true });
            } catch (error) {
                console.error(error);
            }
        } else {
            console.log(`Scheduled Event found for ${JSON.stringify(scheduledEvent)}`);
            firestoreEvents.push({ googleId: event.id, discordId: scheduledEvent.id, calendarId, needsUpdate: true });
            scheduledEvents.splice(scheduledEvents.indexOf(scheduledEvent), 1);
        }
    }

    console.log(`Scheduled Events after updates: ${scheduledEvents}`);

    if(!sendDiscordToGCal) {
        await db.collection('discordevents').doc(scheduledEventManager.guild.id).update({ events: firestoreEvents });
        return;
    } 

    for await (const scheduledEvent of scheduledEvents) {
        console.log(`Creating event for ${JSON.stringify(scheduledEvent)}`);
        const newEvent = {
            'summary': scheduledEvent.name,
            'description': scheduledEvent.description,
            'start': {
                'timeZone': 'America/New_York',
            },
            'end': {
                'timeZone': 'America/New_York',
            },
            'location': scheduledEvent.entityMetadata.location,
        }
    
        const startISOTimestamp = new Date(scheduledEvent.scheduledStartTimestamp).toISOString().slice(11, 19);
        const endISOTimestamp = new Date(scheduledEvent.scheduledEndTimestamp).toISOString().slice(11, 19);
    
        if(startISOTimestamp === '00:00:00' && endISOTimestamp === '00:00:00') {
            newEvent.start.date = new Date(scheduledEvent.scheduledStartTimestamp).toISOString().slice(0, 10);
            newEvent.end.date = new Date(scheduledEvent.scheduledEndTimestamp).toISOString().slice(0, 10);
        } else {
            newEvent.start.dateTime = new Date(scheduledEvent.scheduledStartTimestamp).toISOString();
            newEvent.end.dateTime = new Date(scheduledEvent.scheduledEndTimestamp).toISOString();
        }
    
        if (scheduledEvent.recurrenceRule) {
            console.log(`Recurrence: ${JSON.stringify(scheduledEvent.recurrenceRule)}`);
            newEvent.recurrence = ['RRULE:']
            newEvent.recurrence[0] += scheduledEvent.recurrenceRule.frequency !== null ? `FREQ=${RecurrenceFrequency[scheduledEvent.recurrenceRule.frequency]};` : '';
            newEvent.recurrence[0] += scheduledEvent.recurrenceRule.interval ? `INTERVAL=${scheduledEvent.recurrenceRule.interval};` : '';
            newEvent.recurrence[0] += scheduledEvent.recurrenceRule.count ? `COUNT=${scheduledEvent.recurrenceRule.count};` : '';
            newEvent.recurrence[0] += scheduledEvent.recurrenceRule.byWeekday ? `BYDAY=${scheduledEvent.recurrenceRule.byWeekday.map(day => RecurrenceWeekday[day]).join(',')};` : '';
            newEvent.recurrence[0] += scheduledEvent.recurrenceRule.byNWeekday ? `BYDAY=${scheduledEvent.recurrenceRule.byNWeekday.map(nweekday => nweekday.n + RecurrenceWeekday[nweekday.day])};` : '';
            newEvent.recurrence[0] += scheduledEvent.recurrenceRule.byMonth ? `BYMONTH=${scheduledEvent.recurrenceRule.byMonth.map(month => month).join(',')};` : '';
            newEvent.recurrence[0] += scheduledEvent.recurrenceRule.byMonthDay ? `BYMONTHDAY=${scheduledEvent.recurrenceRule.byMonthDay.join(',')};` : '';
            console.log(`Recurrence: ${newEvent.recurrence[0]}`);
        }
    
        const response = await eventInsert(newEvent, calendarId);
        console.log(response);
        firestoreEvents.push({ googleId: response.data.id, discordId: scheduledEvent.id, calendarId, needsUpdate: true });
    }

    await db.collection('discordevents').doc(scheduledEventManager.guild.id).update({ events: firestoreEvents });
}

const getNextOccurrence = (recurrenceRule, startAt) => {
    console.log(`Recurrence Rule: ${recurrenceRule}`);
    const rule = new RRule.RRule.fromString(recurrenceRule);
    return rule.after(new Date(new Date(startAt).toISOString().replace('Z', '-05:00')));
}

const parseRecurrenceRule = async (recurrenceRule, googleStart, calendar, calendarId, eventId) => {
    let newRecurrenceRule = {};

    const startAt = new Date(googleStart);
    const now = new Date();

    if (startAt.getTime() < now.getTime()) {
        //console.log(`Event has already occurred, finding next occurrence`);
        //const dtstart = startAt.toISOString().replace(/[-:.]/g, '').slice(0, -4) + 'Z';
        //const nextOccurrence = getNextOccurrence(`DTSTART:${dtstart}\n${recurrenceRule}`, now);
		const initialList = await calendar.events.instances({
			calendarId,
			eventId,
			timeMin: new Date().toISOString(),
		});
		if (initialList.data.items.length === 0) {
			console.log('No upcoming instances found');
			return false;
		}
		const nextOccurrence = initialList.data.items[0].start.dateTime ? new Date(initialList.data.items[0].start.dateTime) : new Date(`${initialList.data.items[0].start.date}T00:00:00-05:00`);

        console.log(`Next Occurrence: ${nextOccurrence}`);
        newRecurrenceRule.startAt = nextOccurrence;
    } else {
        newRecurrenceRule.startAt = startAt;
    }

    console.log(`Recurrence Rule: ${recurrenceRule}`);
    for (const rule of recurrenceRule.split(';')) {
        console.log(`Rule: ${rule}`);
        const [key, value] = rule.split('=');
        switch (key) {
            case 'FREQ':
                newRecurrenceRule.frequency = RecurrenceFrequency.indexOf(value);
                break;
            case 'INTERVAL':
                newRecurrenceRule.interval = parseInt(value, 10);
                break;
            case 'BYDAY':
                newRecurrenceRule.by_weekday = value.includes(',') ? value.split(',') : [RecurrenceWeekday.indexOf(value.slice(-2))];
                break;
            case 'BYMONTH':
                newRecurrenceRule.by_month = value.split(',');
                break;
            case 'BYMONTHDAY':
                newRecurrenceRule.by_monthday = value.split(',');
                break;
        }
    }

    return newRecurrenceRule;
};