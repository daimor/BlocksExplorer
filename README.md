# Blocks Explorer
Database Blocks Explorer for InterSystems IRIS/Caché

#### Key features
##### Tree explorer
+ Shows tree of database blocks;
+ Export tree as SVG or PNG image;
+ Shows every node in the block;
+ Open any block just by clicking on node in parent block;
+ Reload block info by clicking at the same node second time;
+ Zoom in and out, fit and navigator;
+ Easy way to switch between view modes (tree/map);

##### Fragmentation map
+ Shows every block with the same colour for every globals;
+ Legend for globals;

#### Run with Docker
You need license key for Caché or IRIS on RedHat systems.
##### Caché
```
docker run -d --name blocksexplorer --rm \
       -p 57772:57772 \
       -v /opt/some/database/for/test:/opt/blocks/db/test \
       -v ~/cache.key:/usr/cachesys/mgr/cache.key \
       daimor/blocksexplorer:cache
```
Generate blocks map as image file in `out` directory
```
docker run -it --rm \
       -v /opt/some/database/for/test:/opt/blocks/db/test \
       -v `pwd`out:/opt/blocks/out \
       daimor/blocksexplorer:cache generate
```

##### IRIS
```
docker run -d --name blocksexplorer --rm \
       -p 52773:52773 \
       -v /opt/some/database/for/test:/opt/blocks/db/test \
       daimor/blocksexplorer:iris
```

Generate blocks map as image file in `out` directory
```
docker run -it --rm \
       -v /opt/some/database/for/test:/opt/blocks/db/test \
       -v `pwd`out:/opt/blocks/out \
       daimor/blocksexplorer:iris generate
```


#### Development mode
Run with docker-compose, will start web part with hot reloading.
```
docker-compose up -d --build
```
It will start server base on IRIS
To start on Caché use this command
```
MODE=cache docker-compose up -d --build
```
By default running on 80 port. To start using it, just open http://localhost/

## Screenshots

![Tree](https://cloud.githubusercontent.com/assets/1212251/9978584/f4964ada-5f40-11e5-8b23-2d20cb03e7b1.png)
![Map](https://cloud.githubusercontent.com/assets/1212251/9978586/f967a3e2-5f40-11e5-82a4-8588d47340b5.png)
