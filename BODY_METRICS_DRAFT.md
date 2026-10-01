# Weight, Height and BMI Draft Pack

This phase adds body-metric capture quality, exact unit normalization, BMI
calculation and adult BMI screening categories.

## Weight
Weight trends are most comparable when measured consistently:
- same scale and location;
- firm, level surface;
- similar time of day;
- little/light clothing;
- no shoes or heavy items;
- remain still until stable.

## Height
Height is normalized to centimeters. The capture context records:
- shoes removed;
- upright posture;
- neutral head position;
- measurement method.

Height quality matters because BMI divides by height squared.

## BMI calculation
BMI = weight (kg) / height (m)^2

The app can compute BMI from normalized weight and height but does not treat BMI
as a diagnosis.

## Adult categories
Initial Draft rules use CDC categories only for age 20+ and nonpregnant users:
- <18.5: underweight;
- 18.5 to <25: healthy weight;
- 25 to <30: overweight;
- 30 to <35: obesity class 1;
- 35 to <40: obesity class 2;
- >=40: obesity class 3.

All remain Draft + Inactive.

## Limitations
BMI is a screening measure. It does not directly measure body fat and should be
considered with other health information. Children/teens use age-specific BMI,
pregnancy is excluded from this pack, and high muscularity may make BMI less
representative of body composition.

## Knowledge Base
A first-party Arabic BMI guide is seeded as Draft + Inactive so the user can
eventually understand calculation, categories, limitations and correct weight
capture without leaving the app.
