# JSON Import Schema

The scheduler imports one JSON object with four top-level keys:

```json
{
  "staff": ["思賢", "元妙"],
  "roleSlots": ["主攝", "副攝", "音控", "機動"],
  "schedules": [
    {
      "date": "5/16（六）｜第一天",
      "activities": [
        {
          "id": "dharma",
          "title": "法會｜士林區",
          "fixed": true,
          "sessions": [
            {
              "time": "08:50–09:20",
              "content": "複習三寶（30分）"
            }
          ]
        }
      ]
    }
  ],
  "assignments": {}
}
```

## Top-Level Fields

- `staff`: Array of staff display names.
- `roleSlots`: Array of assignable role labels.
- `schedules`: Array of activity days. This is required for import.
- `assignments`: Object keyed by `date__time__activityId__role`.

## Schedule Fields

- `date`: Human-readable date or day label.
- `activities`: Activity columns for that date.

## Activity Fields

- `id`: Stable activity identifier. Use simple lowercase ASCII when possible.
- `title`: Column title shown in the scheduler.
- `fixed`: Set `true` for the dharma activity so it stays at the left.
- `sessions`: Time blocks for the activity.

## Session Fields

- `time`: Time range shown in the left column.
- `content`: Activity content shown inside the cell.

## Assignment Key Format

Assignments use this key format:

```text
date__time__activityId__role
```

Example:

```json
{
  "5/16（六）｜第一天__08:50–09:20__dharma__主攝": "思賢"
}
```
