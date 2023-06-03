import cors from "cors";
import express, { Request, Response } from "express";
import path from "path";
import compression from "compression";
import { getCurrentInvoke } from "@vendia/serverless-express";
import deburr from "lodash.deburr";

import units from "./source-data/Czech-Republic-regions-districts-municipalities-cadastral-territories-numeric-ids.json";

const ejs = require("ejs").__express;
const app = express();
const router = express.Router();

app.set("view engine", "ejs");
app.engine(".ejs", ejs);

router.use(compression());
router.use(cors());
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// NOTE: tests can't find the views directory without this
app.set("views", path.join(__dirname, "views"));
/** */
router.get("/", (req: Request, res: Response) => {
  const currentInvoke = getCurrentInvoke();
  const { event = {} } = currentInvoke;
  const { requestContext = {} } = event;
  const { domainName = "localhost:3000" } = requestContext;
  const apiUrl = `https://${domainName}`;
  return res.render("index", {
    apiUrl,
  });
});

router.get("/units", (req: Request, res: Response) => {
  return res.json(units);
});

// change name to search
// allow query params:
// - exact
// - case sensitive? accent sensitive?
router.get("/search/:searchTerm", (req: Request, res: Response) => {
  // const query = req.query;
  const units = findUnits(req.params.searchTerm);

  if (!units) return res.status(404).json({});

  return res.json(units);
});

router.get("/random", (req: Request, res: Response) => {
  const randomHierarchy = getRandomHierarchy();

  return res.json(randomHierarchy);
});

router.get("*", function (req, res, next) {
  res.status(404).send({ message: "Sorry, can't find that!" });
});

type Nullable<T> = T | null;
interface CurrentRefs {
  region: Nullable<string>;
  district: Nullable<string>;
  municipality: Nullable<string>;
}

type Units = typeof units;

const bareString = (input: string = "") => deburr(input.toLowerCase());

// TODO
const findUnits = (needle: string = "") => {
  let bareNeedle = bareString(needle);

  // Todo send only arrays containing values?
  let results = {
    searchTerm: needle,
    regions: [] as any,
    districts: [] as any,
    municipalities: [] as any,
    cadastral_territories: [] as any,
  };

  let currentRefs: CurrentRefs = {
    region: null,
    district: null,
    municipality: null,
  };

  for (let region of Object.values(units.regions)) {
    if (bareString(region.name).includes(bareNeedle)) {
      results.regions.push({
        type: "region",
        name: region.name,
        id: region.name,
        parents: {},
      });
    }
    currentRefs.region = region.name;

    for (let district of Object.values(region.districts)) {
      if (bareString(district.name).includes(bareNeedle)) {
        results.districts.push({
          type: "district",
          name: district.name,
          id: district.id,
          parents: { region: currentRefs.region },
        });
      }
      currentRefs.district = district.name;

      for (let municipality of Object.values(district.municipalities)) {
        if (bareString(municipality.name).includes(bareNeedle)) {
          results.municipalities.push({
            type: "municipality",
            name: municipality.name,
            id: municipality.id,
            parents: {
              region: currentRefs.region,
              district: currentRefs.district,
            },
          });
        }
        currentRefs.municipality = municipality.name;

        for (let cadastral_territory of Object.values(
          municipality.cadastral_territories
        )) {
          if (bareString(cadastral_territory.name).includes(bareNeedle)) {
            results.cadastral_territories.push({
              type: "cadastral_territory",
              name: cadastral_territory.name,
              id: cadastral_territory.id,
              parents: {
                region: currentRefs.region,
                district: currentRefs.district,
                municipality: currentRefs.municipality,
              },
            });
          }
        }
      }
    }
  }
  return results;
};

const getRandomElement = <T>(array: T[]) => {
  const length = array.length;
  if (!length)
    throw new Error("Cannot retrieve random element: array is empty");
  const randomIndex = Math.floor(Math.random() * length);
  return array[randomIndex];
};

interface RandomHierarchy {
  region: {
    name: string;
    id: number;
  };
  district: {
    name: string;
    id: number;
  };
  municipality: {
    name: string;
    id: number;
  };
  cadastral_territory: {
    name: string;
    id: number;
  };
}

const getRandomHierarchy = () => {
  let result = {} as RandomHierarchy;
  let randomRegion = getRandomElement(Object.values(units.regions));
  result.region = {
    name: randomRegion.name,
    id: randomRegion.id,
  };
  let randomDistrict = getRandomElement(Object.values(randomRegion.districts));
  result.district = {
    name: randomDistrict.name,
    id: randomDistrict.id,
  };
  let randomMunicipality = getRandomElement(
    Object.values(randomDistrict.municipalities)
  );
  result.municipality = {
    name: randomMunicipality.name,
    id: randomMunicipality.id,
  };
  let randomCadastralTerritory = getRandomElement(
    Object.values(randomMunicipality.cadastral_territories)
  );
  result.cadastral_territory = {
    name: randomCadastralTerritory.name,
    id: randomCadastralTerritory.id,
  };
  return result;
};

// The serverless-express library creates a server and listens on a Unix
// Domain Socket for you, so you can remove the usual call to app.listen.
// app.listen(3000)
app.use("/", router);

export { app };
