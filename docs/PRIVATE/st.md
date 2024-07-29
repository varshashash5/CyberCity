# PLC Flowcharts

## Substation (`107890.st`)

```mermaid

flowchart LR

BKR12 --> o1((or)) --> TRANSON --> a1
BKR11 --> o1
BKR21 --> a1{and} --> DISTON

BKR31 --> a2{and} --> LOAD1
DISTON --> a2
BKR32 --> a3{and} --> LOAD2
DISTON --> a3 --> LOAD2A
BKR33 --> a4{and} --> LOAD3
DISTON --> a4 --> LOAD3A
BKR34 --> a5{and} --> LOAD4
DISTON --> a5
BKR35 --> a6{and} --> LOAD5
DISTON --> a6
BKR36 --> a7{and} --> LOAD6
DISTON --> a7

```

## ?? (`406635.st`)

```mermaid

flowchart LR


```

## Traffic_Light (`706957.st`)

```mermaid

flowchart LR

```

## ?? (`692121.st`)

```mermaid

flowchart LR

```
