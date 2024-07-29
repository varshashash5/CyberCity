PROGRAM traffic_light
  VAR
    Green_Light_NS AT %QX0.0 : BOOL := FALSE;
    Yellow_Light_NS AT %QX0.1 : BOOL := FALSE;
    Red_Light_NS AT %QX0.2 : BOOL := FALSE;
    Green_Light_EW AT %QX0.3 : BOOL := FALSE;
    Yellow_Light_EW AT %QX0.4 : BOOL := FALSE;
    Red_Light_EW AT %QX0.5 : BOOL := FALSE;
    Green_Pulse_NS AT %IX2.0 : BOOL := FALSE;
    Power_In AT %IX0.2 : BOOL := FALSE;
    Green_Release_NS AT %IX2.1 : BOOL := FALSE;
    Yellow_Pulse_NS AT %IX2.2 : BOOL := FALSE;
    Yellow_Release_NS AT %IX2.3 : BOOL := FALSE;
    Green_Release_EW AT %IX2.4 : BOOL := FALSE;
    Green_Pulse_EW AT %IX2.5 : BOOL := FALSE;
    Yellow_Release_EW AT %IX2.6 : BOOL := FALSE;
    Yellow_Pulse_EW AT %IX2.7 : BOOL := FALSE;
    Green_Timer_NS AT %QW0 : INT := 10;
    Yellow_Timer_NS AT %QW1 : INT := 3;
    Green_Timer_EW AT %QW2 : INT := 10;
    Yellow_Timer_EW AT %QW3 : INT := 3;
  END_VAR
  VAR
    F_TRIG0 : F_TRIG;
    F_TRIG2 : F_TRIG;
    Green_Delay_NS : TON;
    Green_Delay_EW : TON;
    Second_Pulse_Green_NS : TP;
    Second_Pulse_Yellow_NS : TP;
    Second_Pulse_Green_EW : TP;
    Second_Pulse_Yellow_EW : TP;
    Green_Count_NS : CTU;
    Yellow_Count_NS : CTU;
    Green_Count_EW : CTU;
    Yellow_Count_EW : CTU;
  END_VAR
  VAR
    Blink_Red_NS AT %QX3.0 : BOOL := FALSE;
    Blink_Red_NS_1 AT %IX3.1 : BOOL := FALSE;
    Blink_Red_NS_2 AT %IX3.2 : BOOL := FALSE;
  END_VAR
  VAR
    Blink_Timer_1 : TON;
    Blink_Timer_2 : TON;
  END_VAR
  VAR
    Blink_Red_EW AT %QX4.0 : BOOL := FALSE;
    Blink_Red_EW1 AT %IX4.1 : BOOL := FALSE;
    Blink_Red_EW2 AT %IX4.2 : BOOL := FALSE;
  END_VAR
  VAR
    Blink_Timer_3 : TON;
    Blink_Timer_4 : TON;
  END_VAR
  VAR
    Blink_Red_All AT %QX5.0 : BOOL := FALSE;
    Blink_Red_All1 AT %IX5.1 : BOOL := FALSE;
    Blink_Red_All2 AT %IX5.2 : BOOL := FALSE;
  END_VAR
  VAR
    Blink_Timer_5 : TON;
    Blink_Timer_6 : TON;
  END_VAR
  VAR
    Blink_Yellow_All AT %QX6.0 : BOOL := FALSE;
    Blink_Yellow_All1 AT %IX6.1 : BOOL := FALSE;
    Blink_Yellow_All2 AT %IX6.2 : BOOL := FALSE;
  END_VAR
  VAR
    Blink_Timer_7 : TON;
    Blink_Timer_8 : TON;
  END_VAR
  VAR
    Green_Light_NS_1 AT %IX7.0 : BOOL := FALSE;
    Yellow_Light_NS_1 AT %IX7.1 : BOOL := FALSE;
    Yellow_Light_NS_2 AT %IX7.2 : BOOL := FALSE;
    Yellow_Light_NS_3 AT %IX7.3 : BOOL := FALSE;
    Red_Light_NS_1 AT %IX7.4 : BOOL := TRUE;
    Red_Light_NS_2 AT %IX7.5 : BOOL := FALSE;
    Red_Light_NS_3 AT %IX7.6 : BOOL := FALSE;
    Green_Light_EW_1 AT %IX7.7 : BOOL := FALSE;
    Yellow_Light_EW_1 AT %IX8.0 : BOOL := FALSE;
    Yellow_Light_EW_2 AT %IX8.1 : BOOL := FALSE;
    Yellow_Light_EW_3 AT %IX8.2 : BOOL := FALSE;
    Red_Light_EW_1 AT %IX8.3 : BOOL := FALSE;
    Red_Light_EW_2 AT %IX8.4 : BOOL := FALSE;
    Red_Light_EW_3 AT %IX8.5 : BOOL := FALSE;
    TEST_ALL AT %QX7.0 : BOOL := FALSE;
    RUN AT %QX8.0 : BOOL := TRUE;
  END_VAR
  VAR
    R_TRIG1 : R_TRIG;
    R_TRIG2 : R_TRIG;
    R_TRIG3 : R_TRIG;
    R_TRIG4 : R_TRIG;
  END_VAR

  Green_Delay_NS(IN := Red_Light_EW_1, PT := T#1500ms);
  Green_Light_NS_1 := RUN AND Power_In AND NOT(Green_Release_NS) AND Green_Delay_NS.Q;
  Second_Pulse_Green_NS(IN := NOT(Green_Pulse_NS) AND Green_Light_NS_1, PT := T#1000ms);
  Green_Pulse_NS := Second_Pulse_Green_NS.Q;
  R_TRIG1(CLK := Green_Pulse_NS);
  Green_Count_NS(CU := R_TRIG1.Q, R := Green_Light_EW_1, PV := Green_Timer_NS);
  Green_Release_NS := Green_Count_NS.Q;
  F_TRIG0(CLK := Green_Light_NS_1);
  Yellow_Light_NS_1 := RUN AND Power_In AND (Yellow_Light_NS_1 AND NOT(Yellow_Release_NS) OR F_TRIG0.Q);
  Second_Pulse_Yellow_NS(IN := NOT(Yellow_Pulse_NS) AND Yellow_Light_NS_1, PT := T#1000ms);
  Yellow_Pulse_NS := Second_Pulse_Yellow_NS.Q;
  R_TRIG2(CLK := Yellow_Pulse_NS);
  Yellow_Count_NS(CU := R_TRIG2.Q, R := Green_Light_EW_1, PV := Yellow_Timer_NS);
  Yellow_Release_NS := Yellow_Count_NS.Q;
  Red_Light_NS_1 := RUN AND Power_In AND NOT(Green_Light_NS_1) AND NOT(Yellow_Light_NS_1);
  Green_Delay_EW(IN := Red_Light_NS_1, PT := T#1500ms);
  Green_Light_EW_1 := RUN AND Power_In AND NOT(Green_Release_EW) AND Green_Delay_EW.Q;
  Second_Pulse_Green_EW(IN := NOT(Green_Pulse_EW) AND Green_Light_EW_1, PT := T#1000ms);
  Green_Pulse_EW := Second_Pulse_Green_EW.Q;
  R_TRIG3(CLK := Green_Pulse_EW);
  Green_Count_EW(CU := R_TRIG3.Q, R := Green_Light_NS_1, PV := Green_Timer_EW);
  Green_Release_EW := Green_Count_EW.Q;
  F_TRIG2(CLK := Green_Light_EW_1);
  Yellow_Light_EW_1 := RUN AND Power_In AND (Yellow_Light_EW_1 AND NOT(Yellow_Release_EW) OR F_TRIG2.Q);
  Second_Pulse_Yellow_EW(IN := NOT(Yellow_Pulse_EW) AND Yellow_Light_EW_1, PT := T#1000ms);
  Yellow_Pulse_EW := Second_Pulse_Yellow_EW.Q;
  R_TRIG4(CLK := Yellow_Pulse_EW);
  Yellow_Count_EW(CU := R_TRIG4.Q, R := Green_Light_NS_1, PV := Yellow_Timer_EW);
  Yellow_Release_EW := Yellow_Count_EW.Q;
  Red_Light_EW_1 := RUN AND Power_In AND NOT(Yellow_Light_EW_1) AND NOT(Green_Light_EW_1);
  Blink_Timer_1(IN := NOT(Blink_Red_NS_2) AND Power_In AND Blink_Red_NS, PT := T#1000ms);
  Blink_Red_NS_1 := Blink_Timer_1.Q;
  Blink_Timer_2(IN := Blink_Red_NS_1, PT := T#1000ms);
  Blink_Red_NS_2 := Blink_Timer_2.Q;
  Red_Light_NS_2 := Blink_Red_NS_1;
  Yellow_Light_EW_2 := Blink_Red_NS_1;
  Blink_Timer_3(IN := NOT(Blink_Red_EW2) AND Power_In AND Blink_Red_EW, PT := T#1000ms);
  Blink_Red_EW1 := Blink_Timer_3.Q;
  Blink_Timer_4(IN := Blink_Red_EW1, PT := T#1000ms);
  Blink_Red_EW2 := Blink_Timer_4.Q;
  Red_Light_EW_2 := Blink_Red_EW1;
  Yellow_Light_NS_2 := Blink_Red_EW1;
  Blink_Timer_5(IN := NOT(Blink_Red_All2) AND (Blink_Red_All OR NOT(Power_In)), PT := T#1000ms);
  Blink_Red_All1 := Blink_Timer_5.Q;
  Blink_Timer_6(IN := Blink_Red_All1, PT := T#1000ms);
  Blink_Red_All2 := Blink_Timer_6.Q;
  Red_Light_EW_3 := Blink_Red_All1;
  Red_Light_NS_3 := Blink_Red_All1;
  Blink_Timer_7(IN := NOT(Blink_Yellow_All2) AND Power_In AND Blink_Yellow_All, PT := T#1000ms);
  Blink_Yellow_All1 := Blink_Timer_7.Q;
  Blink_Timer_8(IN := Blink_Yellow_All1, PT := T#1000ms);
  Blink_Yellow_All2 := Blink_Timer_8.Q;
  Yellow_Light_EW_3 := Blink_Yellow_All1;
  Yellow_Light_NS_3 := Blink_Yellow_All1;
  Green_Light_NS := Power_In AND TEST_ALL OR Green_Light_NS_1;
  Yellow_Light_NS := Power_In AND TEST_ALL OR Yellow_Light_NS_1 OR Yellow_Light_NS_2 OR Yellow_Light_NS_3;
  Red_Light_NS := Power_In AND TEST_ALL OR Red_Light_NS_1 OR Red_Light_NS_2 OR Red_Light_NS_3;
  Green_Light_EW := Power_In AND TEST_ALL OR Green_Light_EW_1;
  Yellow_Light_EW := Power_In AND TEST_ALL OR Yellow_Light_EW_1 OR Yellow_Light_EW_2 OR Yellow_Light_EW_3;
  Red_Light_EW := Power_In AND TEST_ALL OR Red_Light_EW_1 OR Red_Light_EW_2 OR Red_Light_EW_3;
END_PROGRAM


CONFIGURATION Config0

  RESOURCE Res0 ON PLC
    TASK TaskMain(INTERVAL := T#50ms,PRIORITY := 0);
    PROGRAM Inst0 WITH TaskMain : traffic_light;
  END_RESOURCE
END_CONFIGURATION
