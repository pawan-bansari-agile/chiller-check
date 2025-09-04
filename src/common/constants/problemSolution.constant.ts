export const PROBLEMS = [
  {
    ProblemID: 1,
    ProblemArea: "CondInletLoss",
    Problem: "High Condenser Water Temp.",
  },
  {
    ProblemID: 2,
    ProblemArea: "EvapTempLoss",
    Problem: "Low Set Point - Evaporator",
  },
  {
    ProblemID: 3,
    ProblemArea: "CondAppLoss",
    Problem: "High Condenser Approach",
  },
  {
    ProblemID: 4,
    ProblemArea: "EvapAppLoss",
    Problem: "High Evaporator Approach",
  },
  {
    ProblemID: 5,
    ProblemArea: "NonCondLoss",
    Problem: "Non-condensables - Condenser",
  },
  {
    ProblemID: 6,
    ProblemArea: "DeltaLoss",
    Problem: "Low Water Flow - Condenser",
  },
];

export const SOLUTIONS = [
  {
    SolutionID: 1,
    ProblemID: 1,
    ProblemCheck: "Check instrumentation for accuracy and calibration.",
    Solution: "Recalibrate or replace instruments.",
  },
  {
    SolutionID: 2,
    ProblemID: 1,
    ProblemCheck:
      "Check tower water temperature controls to insure proper operation and setpoint.",
    Solution: "Reset tower temp controller.",
  },
  {
    SolutionID: 3,
    ProblemID: 1,
    ProblemCheck:
      "Check cooling tower for mechanical problems such as belts slipping, motor problems, plugged orifices in hot well, makeup valve not working, hot wells properly balanced, plugged fill, broken slats, fan problems, etc.",
    Solution: "Repair cooling tower.",
  },
  {
    SolutionID: 4,
    ProblemID: 2,
    ProblemCheck: "Check instrumentation for accuracy and calibration.",
    Solution: "Recalibrate or replace instruments.",
  },
  {
    SolutionID: 5,
    ProblemID: 2,
    ProblemCheck: "Check chiller set point control.",
    Solution: "Adjust if necessary.",
  },
  {
    SolutionID: 6,
    ProblemID: 2,
    ProblemCheck:
      "Determine if lower than specified chill water temperatures is required to satisfy space conditions.",
    Solution:
      "Check condition of chill water coils, temp controls, chill water flow conditions, etc.",
  },
  {
    SolutionID: 7,
    ProblemID: 2,
    ProblemCheck:
      "Determine if chiller set point is being controlled remotely by BAS system.",
    Solution: "Adjust BAS controls.",
  },
  {
    SolutionID: 8,
    ProblemID: 3,
    ProblemCheck: "Check instrumentation for accuracy and calibration.",
    Solution: "Recalibrate or replace instruments.",
  },
  {
    SolutionID: 9,
    ProblemID: 3,
    ProblemCheck:
      "Review water treatment logs to insure proper operation, treatment and  blowdown.",
    Solution: "Contact water treatment company if necessary.",
  },
  {
    SolutionID: 10,
    ProblemID: 3,
    ProblemCheck:
      "Check refrigerant level control or refrigerant metering device.",
    Solution: "Adjust level control. Adjust refrigerant float. Clear orifice.",
  },
  {
    SolutionID: 11,
    ProblemID: 3,
    ProblemCheck: "Inspect condenser tubes for fouling, scale, dirt etc.",
    Solution: "Clean tubes if necessary.",
  },
  {
    SolutionID: 12,
    ProblemID: 3,
    ProblemCheck:
      "Check for division plate bypassing due to gasket problems or erosion.",
    Solution: "Replace division plate gasket.",
  },
  {
    SolutionID: 13,
    ProblemID: 4,
    ProblemCheck: "Check instrumentation for accuracy and calibration.",
    Solution: "Recalibrate or replace instruments.",
  },
  {
    SolutionID: 14,
    ProblemID: 4,
    ProblemCheck:
      "Review maintenance logs and determine if excess oil has been added and \r\n        if so, how much. If indications are that excess oil has been added take \r\n        a refrigerant sample and determine the percent oil in the charge.",
    Solution:
      "The refrigerant should be reclaimed or an oil recovery system added if the oil content is greater than 1.5 to 2%.",
  },
  {
    SolutionID: 15,
    ProblemID: 4,
    ProblemCheck:
      "At this point there are two likely causes of the problem; low on charge or tube fouling. Some considerations in determining the direction to take are:\r\n      <ul>\r\n        <li>Has the chiller had a history of leaks?</li>\r\n        <li>Is the purge indicating excessive run time?</li>\r\n        <li>Is the chiller used in an open evaporator system such as a textile \r\n          plant using an air washer?</li>\r\n        <li>Has there been a history of evaporator tube fouling?</li>\r\n      </ul>\r\n      <p>If the answers to the above questions does not lead to an obvious diagnosis \r\n        a recommended course of action is as follows:<br>\r\n      </p>",
    Solution:
      "<ul><li>Trim charge using a new drum of refrigerant. If approach starts   to come together as refrigerant is added, continue to add charge until the approach temperature is within specs. This indicates a loss of charge and a full leak test is warranted.</td>\r\n    <td>Trim refrigerant charge.</li><li>If adding refrigerant does not improve the evaporator approach, \r\n      the next step is to drop the evaporator heads and inspect the tubes for \r\n      fouling, as well as inspecting the division plate gasket for a possible \r\n      bypass problem. Clean tubes if necessary. Replace division plate gasket \r\n      if necessary.</li></ul>",
  },
  {
    SolutionID: 16,
    ProblemID: 5,
    ProblemCheck: "Check instrumentation for accuracy and calibration.",
    Solution: "Recalibrate or replace instruments.",
  },
  {
    SolutionID: 17,
    ProblemID: 5,
    ProblemCheck:
      "Check to insure liquid refrigerant is not building up in the condenser \r\n        pressure gauge line.",
    Solution:
      "Blow down line or apply heat to remove liquid. A build-up of liquid in this line can add as much as 3PSIG to the gauge reading, giving a false indication of non-condensables in the chiller.",
  },
  {
    SolutionID: 18,
    ProblemID: 5,
    ProblemCheck: "Check purge for proper operation and purge count.",
    Solution:
      "Turn on purge or repair purge if necessary. If purge frequency is excessive, leak test chiller.",
  },
  {
    SolutionID: 19,
    ProblemID: 6,
    ProblemCheck:
      "This may or may not be a problem. Older chillers were typically designed for 3 GPM per ton of cooling. Some of the newer chillers are designed with variable condenser flow to take advantage of pump energy savings with reduced flow. If your chiller is designed for a fixed condenser water flow rate then a reduction in flow is an indication of something going wrong with the system and the following items should be checked:",
    Solution: null,
  },
  {
    SolutionID: 20,
    ProblemID: 6,
    ProblemCheck: "Check the condenser water pump strainer.",
    Solution: "Blow down or clean strainer if necessary.",
  },
  {
    SolutionID: 21,
    ProblemID: 6,
    ProblemCheck:
      "Check the cooling tower makeup valve for proper operation and proper water level in tower sump.",
    Solution: "Correct tower make-up valve.",
  },
  {
    SolutionID: 22,
    ProblemID: 6,
    ProblemCheck:
      "Check condenser water system valves to insure they are properly opened.",
    Solution: "Open or balance valves.",
  },
  {
    SolutionID: 23,
    ProblemID: 6,
    ProblemCheck:
      "Check pump operation for indications of impeller wear, RPM, etc.",
    Solution: "Repair pump or drive.",
  },
  {
    SolutionID: 24,
    ProblemID: 6,
    ProblemCheck:
      "Check tower bypass valves and controls for proper operation.",
    Solution: "Repair valves/controls.",
  },
  {
    SolutionID: 25,
    ProblemID: 6,
    ProblemCheck:
      "Check chiller water boxes for plugged tubes or for trash blocking tubes.",
    Solution: "Clear tubes.",
  },
];
