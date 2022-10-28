

# Top level components

```
                    +-------------------------+   WebSocket
                    |Client|                  | +--------------+
                    +------+                  |                |
                    |                         |                |
                    | Vue.js SPA              |                |
                    |                         |                |
                    +-------------------------+                |
                                                               |
                                                               v

  NFS mount         +-------------------------+   NFS mount   +--------------------+
+-----------------> |Shared volume|           | <-----------+ |Backend|            |
|                   +-------------+           |               +-------+            |
|                   |                         |               |                    |
|                   | Mesh storage            |               | Tornado Web Server |
|                   |                         |               |                    |
|                   +-------------------------+               +--------------------+
|
|                                                              ^
|    +----------------------------------------+                |
+--+ |SimWorker1|                             |                |
|    +----------+                             |                |
|    |                                        |                |
|    | +--------------+     +---------------+ |   WebSocket    |
|    | |Simulator proc| <-> |Controller proc| | +--------------+
|    | +--------------+     +---------------+ |                |
|    |                                        |                |
|    +----------------------------------------+                |
|                                                              |
|    +----------------------------------------+                |
+--+ |SimWorker2|                             |                |
     +----------+                             |                |
     |                                        |                |
     | +--------------+     +---------------+ |   WebSocket    |
     | |Simulator proc| <-> |Controller proc| | +--------------+
     | +--------------+     +---------------+ |
     |                                        |
     +----------------------------------------+

                              Autoscaling group
```

Subcellular app with molecular repository was designed as extensible, scalable and platform
agnostic solution that can be deployed to various types of cloud environments. Below is the list of
high level subsystems and their roles.

* DB engine
* Geometry storage
* Sim worker
* Backend
* Client SPA app

## DB engine

The component provides persistence for the application data utilising already existing solutions
like Blue Brain Nexus and mongoDB.

Used as central storage for:
* subcellular app, containing:
  * user info (optional)
  * public and private models
  * geometry surface meshes
  * simulation configurations and templates
  * artefacts produced by simulations:
    * logs
    * cumulative per-observable molecule concentrations
    * spatial molecule distributions
* molecular repository, storing:
  * molecule definitions
  * initial species concentrations
  * reactions and diffusions

## Geometry storage

Component accommodates:
* original volumetric mesh files uploaded by users
* geometry metadata, including:
  * mapping between model structures and their corresponding mesh tetrahedra/triangles
  * free diffusion boundaries
* geometry scale
* mesh files exported in STEPS format

## Simulation worker

Incorporates a logic to:
* establish a connection to the Backend via WebSockets
* notify the Backend with all state changes
* execute requests from the Backend to:
* initialize a specific solver with a given model and configuration
* run a simulation
* cancel running simulation
* send to Backend in real-time simulation artefacts:
  * logs
  * step observable molecule concentrations
  * spatial molecule distributions

## Backend

Provides methods and procedures that can be invoked remotely by a client application via the
WebSocket connection:
* manage data related to models, geometries, simulations and their artifacts
* run and stop simulations
* query and operate data from molecular repository

As a central subsystem keeps track of connected simulation workers, manages their state by issuing
requests to run or stop simulations and processes changes in their state.

## Client Single Page Application

Contains all presentation logic and enables users to manage models and run simulations without
special setup or configuration.

Communicates with the Backend through WebSockets.
Consists of three top-level components:
* model editor
* molecular repository
* simulation result viewer

