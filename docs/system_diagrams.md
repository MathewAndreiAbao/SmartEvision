# Smart E-VISION: System Architecture Diagrams (Mermaid)

This document contains the structural definitions for the system's Context Diagram and Data Flow Diagram (DFD) Level 0.

---

## 🔝 1. Context Diagram

The Context Diagram defines the system's boundaries and its interactions with external entities.

```mermaid
graph LR
    subgraph "System Boundary"
        S["SMART E-VISION<br/>Progressive Web App for<br/>Instructional Supervision Archiving"]
    end

    T["Teacher /<br/>Master Teacher"]
    SH["School Head /<br/>District Supervisor"]

    %% Teacher Flows
    T -->|"Login Credentials"| S
    T -->|"Profile information"| S
    T -->|"Instructional documents (DLLs, ISPs, ISRs)"| S
    T -->|"Monitoring Queries"| S
    
    S -->|"Submission Status / Confirmation"| T
    S -->|"Document Verification status (QR/Hash)"| T
    S -->|"Personal Compliance Overview"| T
    S -->|"Technical Assistant Data"| T

    %% Supervision Flows
    SH -->|"Login Credentials"| S
    SH -->|"Report Requests"| S
    SH -->|"Monitoring Parameters"| S
    SH -->|"Monitoring Queries"| S

    S -->|"District Wide Compliance Report"| SH
    S -->|"AI-generated metadata & analytics"| SH
    S -->|"Predictive risk indicators (K-Means)"| SH

    style S fill:#0f172a,stroke:#3b82f6,stroke-width:4px,color:#fff
    style T fill:#f8fafc,stroke:#64748b,stroke-width:2px
    style SH fill:#f8fafc,stroke:#64748b,stroke-width:2px
```

---

## 🔄 2. DFD Diagram 0

DFD Level 0 decomposes the system into its primary functional processes and data stores.

```mermaid
flowchart TB
    %% External Entities
    subgraph Entities
        T[Teacher]
        SH[School Head]
        DS[Division Supervisor]
        ADM[IT Admin]
        PUB[Guest/Public]
    end

    %% Processes
    subgraph Processes
        P1((1.0 Administer<br/>Auth & RBAC))
        P2((2.0 Execute<br/>Intelligent Archival))
        P3((3.0 Process<br/>Advanced Analytics))
        P4((4.0 Coordinate<br/>Timeline & Alerts))
        P5((5.0 Facilitate<br/>Public Verification))
    end

    %% Data Stores
    subgraph DataStores
        D1[(D1: User Profiles)]
        D2[(D2: Submissions)]
        D3[(D3: Academic Calendar)]
        D4[(D4: Audit & Notifications)]
    end

    %% Flow: Process 1.0
    T -->|Login Request| P1
    DS -->|User Activation| P1
    P1 <-->|Read/Write Profile| D1

    %% Flow: Process 2.0
    T -->|Doc Submission| P2
    P2 -->|OCR/QR Result| D2
    P2 -->|File Metadata| D2
    D2 -->|Archived Docs| P5

    %% Flow: Process 3.0
    D2 -->|Submission Trends| P3
    P3 -->|Behavioral Scores| D2
    P3 -->|Risk Alerts| D4
    P3 -->|Heatmap Data| SH
    P3 -->|Cluster Results| DS

    %% Flow: Process 4.0
    DS -->|Deadline Config| P4
    P4 <-->|Schedule Data| D3
    P4 -->|System Alerts| D4
    D4 -->|Feedback| T

    %% Flow: Process 5.0
    PUB -->|Hash Query| P5
    P5 <-->|Integrity Match| D2
    P5 -->|Verification Result| PUB

    %% Styling
    style P1 fill:#eff6ff,stroke:#3b82f6
    style P2 fill:#eff6ff,stroke:#3b82f6
    style P3 fill:#eff6ff,stroke:#3b82f6
    style P4 fill:#eff6ff,stroke:#3b82f6
    style P5 fill:#eff6ff,stroke:#3b82f6
    
    style D1 fill:#fff7ed,stroke:#f97316
    style D2 fill:#fff7ed,stroke:#f97316
    style D3 fill:#fff7ed,stroke:#f97316
    style D4 fill:#fff7ed,stroke:#f97316
```
