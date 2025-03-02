import { google } from 'googleapis';
import Firestore from '@google-cloud/firestore';
import { eventInsert } from './eventInsert.js';

export const syncAllEvents = async (calendarId, scheduledEventManager, sendDiscordToGCal) => {
    const RecurrenceFrequency = ['YEARLY', 'MONTHLY', 'WEEKLY', 'DAILY'];
    const RecurrenceWeekday = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

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
        const start = event.start.dateTime ? new Date(event.start.dateTime).toISOString() : new Date(event.start.date).toISOString();
        const end = event.start.dateTime ? new Date(event.end.dateTime).toISOString() : new Date(event.end.date).toISOString();
        const scheduledEvent = scheduledEvents.find((scheduledEvent) => {
            const googleDescription = event.description ?? null;
            const googleLocation = event.location ?? 'No Location Provided';
            const discordDescription = scheduledEvent.description === '' || scheduledEvent.description === undefined ? null : scheduledEvent.description;
            console.log(`Scheduled Event: ${JSON.stringify(scheduledEvent)}`);
            console.log(`Event: ${JSON.stringify(event)}`);
            if (scheduledEvent.name === event.summary &&
                scheduledEvent.entityMetadata.location === googleLocation &&
                discordDescription === googleDescription &&
                new Date(scheduledEvent.scheduledStartTimestamp).toISOString().slice(0, -5) === start.slice(0, -5) &&
                new Date(scheduledEvent.scheduledEndTimestamp).toISOString().slice(0, -5) === end.slice(0, -5)) return true;
            else return false;
        });
        console.log(`Matching Scheduled Event: ${scheduledEvent}`);

        if (!scheduledEvent) {
            let newRecurrenceRule;
            if (event.recurrence) {
                newRecurrenceRule = { startAt: new Date(event.start.date || event.start.dateTime.slice(0, -6) + 'Z').toISOString().replace('Z', '-05:00') };
                const recurrenceRule = event.recurrence[0].split(':')[1].split(';')
                console.log(`Recurrence Rule: ${recurrenceRule}`);
                for (const rule of recurrenceRule) {
                    console.log(`Rule: ${rule}`);
                    if (rule.includes('FREQ')) {
                        newRecurrenceRule.frequency = RecurrenceFrequency.indexOf(rule.split('=')[1]);
                    }
                    if (rule.includes('INTERVAL')) {
                        newRecurrenceRule.interval = rule.split('=')[RecurrenceWeekday.indexOf(rule.split('=')[1])];
                    }
                    if (rule.includes('BYDAY')) {
                        if (rule.includes(',')) {
                            newRecurrenceRule.by_weekday = rule.split('=')[1].split(',');
                        } else {
                            newRecurrenceRule.by_nweekday = [{ n: rule.split('=')[1].slice(0, -2), day: rule.split('=')[1].slice(-2) }];
                        }
                    }
                    if (rule.includes('BYMONTH')) {
                        newRecurrenceRule.by_month = rule.split('=')[1].split(',');
                    }
                    if (rule.includes('BYMONTHDAY')) {
                        newRecurrenceRule.by_monthday = rule.split('=')[1].split(',');
                    }
                }
            }
            try {
                const newScheduledEvent = await scheduledEventManager.create({
                    name: event.summary,
                    description: event.description ?? null,
                    scheduledStartTime: new Date(event.start.date || event.start.dateTime.slice(0, -6) + 'Z').toISOString().replace('Z', '-05:00'),
                    scheduledEndTime: new Date(event.end.date || event.end.dateTime.slice(0, -6) + 'Z').toISOString().replace('Z', '-05:00'),
                    entityMetadata: { location: event.location ?? 'No Location Provided' },
                    entityType: 3,
                    privacyLevel: 2,
                    recurrenceRule: newRecurrenceRule || undefined,
                })
                firestoreEvents.push({ googleId: event.id, discordId: newScheduledEvent.id, calendarId, needsUpdate: true });
            }
            catch (error) {
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