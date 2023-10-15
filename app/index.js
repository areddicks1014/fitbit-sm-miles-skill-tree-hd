import clock from "clock";
import document from "document";
import { preferences } from "user-settings";
import { battery, charger } from "power";
import { HeartRateSensor } from "heart-rate";
import { me as appbit } from "appbit";
import { today, primaryGoal, goals } from "user-activity";
import { BodyPresenceSensor } from "body-presence";
import { display } from "display";
import { user } from "user-profile";
import * as util from "../common/utils";

// Update the clock every minute
clock.granularity = "minutes";

// Get a handle on the <text> element
const displayTime = document.getElementById("time");
const displayDate = document.getElementById("date");
const displayBattery = document.getElementById("battery-percent");
const batteryMeter = document.getElementById("battery-meter");
const heartRate = document.getElementById("heart-rate");
const heartIcon = document.getElementById("heart-icon");
const calsBurned = document.getElementById("cals-burned");
const calsIcon = document.getElementById("calories-icon");
const stepsTaken = document.getElementById("steps-taken");
const stepsIcon = document.getElementById("steps-icon");
const activeMins = document.getElementById("active-mins");
const activeIcon = document.getElementById("active-mins-icon");

// const goalMetColor = "#0071bc";
const goalMetColor = '#4ffefa';
let connected;

// Update the <text> element every tick with the current time
clock.ontick = (evt) => {
  let today = evt.date;
  let hours = today.getHours();
  if (preferences.clockDisplay === "12h") {
    // 12h format
    hours = hours % 12 || 12;
  } else {
    // 24h format
    hours = util.zeroPad(hours);
  }
  let mins = util.zeroPad(today.getMinutes());
  let day = today.toString().split(' ');
  displayTime.text = `${hours}:${mins}`;
  displayDate.text = `${day[0]} ${day[1]} ${day[2]}`;
  
  setBatteryLevel(getBatteryPercent());
  updateStats();
}

charger.onchange = (event) => {
  // change battery meter color?
  connected = (charger.connected || battery.charging);
}

function setBatteryColor(color) {
  batteryMeter.style.fill = color;
}

battery.onchange = (event) => {
  let batteryPercent = getBatteryPercent();
  setBatteryLevel(batteryPercent);
}

if (HeartRateSensor && appbit.permissions.granted("access_heart_rate")) {
  // updates once every 3 seconds
  const hrm = new HeartRateSensor({ frequency: 1, batch: 3 });
  let hr = 0;
  hrm.addEventListener("reading", () => {
    hr = hrm.readings.heartRate[hrm.readings.heartRate.length - 1];
    heartRate.text = `${hr}`;
    if (user && appbit.permissions.granted("access_user_profile")) {
      switch (user.heartRateZone(hr)) {
        case "out-of-range": heartIcon.style.fill = 'white';
        break;
        case "fat-burn": heartIcon.style.fill = '#F7B316';
        break;
        case "cardio": heartIcon.style.fill = '#F68D1F';
        break;
        case "peak": heartIcon.style.fill = '#EF3847';
        break;
        default: heartIcon.style.fill = 'white';
      }
    }
  });
  display.addEventListener("change", () => {
    // Automatically stop the sensor when the screen is off to conserve battery
    display.on ? hrm.start() : hrm.stop();
  });
  if (BodyPresenceSensor) {
    const body = new BodyPresenceSensor();
    body.addEventListener("reading", () => {
      if (!body.present) {
        hrm.stop();
      } else {
        hrm.start();
      }
    });
    body.start();
  }
}

function updateStats() {
  if (appbit.permissions.granted("access_activity")) {
    if (today) {
      stepsTaken.text = `${today.adjusted.steps}`;
      if (today.adjusted.steps >= goals.steps && goals.steps) {
        stepsTaken.style.fill = goalMetColor;
        stepsIcon.style.fill = goalMetColor;
      } else {
        stepsTaken.style.fill = 'white';
        stepsIcon.style.fill = 'white';
      }
      calsBurned.text = `${today.adjusted.calories}`;
      if (today.adjusted.calories >= goals.calories && goals.calories) {
        calsBurned.style.fill = goalMetColor;
        calsIcon.style.fill = goalMetColor;
      } else {
        calsBurned.style.fill = 'white';
        calsIcon.style.fill = 'white';
      }
      activeMins.text = `${today.adjusted.activeZoneMinutes.total}`;
      if (today.adjusted.activeZoneMinutes.total >= goals.activeZoneMinutes.total 
          && goals.activeZoneMinutes) {
        activeMins.style.fill = goalMetColor;
        activeIcon.style.fill = goalMetColor;
      } else {
        activeMins.style.fill = 'white';
        activeIcon.style.fill = 'white';
      }
    }
  }
}

function getBatteryPercent() {
  return Math.floor(battery.chargeLevel);
}

function setBatteryLevel(batteryPercent) {
  displayBattery.text = `${batteryPercent}`;
  batteryMeter.height = ((batteryPercent / 100) * 16);
  batteryMeter.y = (282 - ((batteryPercent / 100) * 16));
  if (batteryPercent <= 25) {
    batteryMeter.style.fill = '#c70f1f';
  } else {
    batteryMeter.style.fill = 'white';
  }
  if (connected) {
    setBatteryColor("fb-green");
  }
}
