import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeFormationCompatibility,
  generateBalancedTeams,
} from "../src/lib/draftEngine.ts";
import { getOverallRating } from "../src/lib/positions.ts";

const player = (id, positions) => ({ id, name: id, avatar: "", positions });
const position = (code, rating, isMain = false) => ({ code, rating, isMain });
const mainPosition = (item) => item.positions.find((entry) => entry.isMain)?.code;
const positionDifference = (teamA, teamB, code) =>
  Math.abs(
    teamA.filter((item) => mainPosition(item) === code).length -
      teamB.filter((item) => mainPosition(item) === code).length
  );

test("OVR, yeni ve zayıf mevkiler eklendiğinde düşmez", () => {
  const singlePosition = player("single", [position("DEF", 80, true)]);
  const weakAlternatives = player("multi", [
    position("DEF", 90, true),
    position("MID", 70),
    position("FWD", 65),
    position("GK", 50),
  ]);

  assert.equal(getOverallRating(singlePosition), 80);
  assert.equal(getOverallRating(weakAlternatives), 90);
});

test("OVR, güçlü alternatif mevkiler için sınırlı bonus verir", () => {
  const versatile = player("versatile", [
    position("MID", 84, true),
    position("DEF", 82),
    position("FWD", 80),
    position("GK", 55),
  ]);

  assert.equal(getOverallRating(versatile), 86);
});

test("overall modu, eşit oyuncu sayısıyla mümkün olan en düşük OVR farkını bulur", () => {
  const ratings = [91, 88, 86, 84, 82, 80, 78, 76, 74, 71];
  const players = ratings.map((rating, index) =>
    player(String(index), [position(index < 2 ? "GK" : "MID", rating, true)])
  );
  const config = {
    teamSize: 5,
    formation: "1-1-2-1",
    teamAName: "A",
    teamBName: "B",
  };

  const result = generateBalancedTeams(players, config, "overall");
  const sum = (team) => team.reduce((total, item) => total + getOverallRating(item), 0);
  const actualDifference = Math.abs(sum(result.teamA) - sum(result.teamB));

  let expectedDifference = Number.POSITIVE_INFINITY;
  for (let mask = 0; mask < 1 << players.length; mask += 1) {
    if ((mask & 1) === 0) continue;
    const selected = players.filter((_, index) => mask & (1 << index));
    if (selected.length !== config.teamSize) continue;
    const other = players.filter((_, index) => !(mask & (1 << index)));
    const selectedGks = selected.filter((item) => item.positions[0].code === "GK").length;
    const otherGks = other.filter((item) => item.positions[0].code === "GK").length;
    if (selectedGks === 0 || otherGks === 0) continue;
    if (["GK", "DEF", "MID", "FWD"].some((code) => positionDifference(selected, other, code) > 1)) continue;
    expectedDifference = Math.min(expectedDifference, Math.abs(sum(selected) - sum(other)));
  }

  assert.equal(result.teamA.length, config.teamSize);
  assert.equal(result.teamB.length, config.teamSize);
  assert.equal(actualDifference, expectedDifference);
  assert.equal(result.teamA.filter((item) => item.assignedPosition === "GK").length, 1);
  assert.equal(result.teamB.filter((item) => item.assignedPosition === "GK").length, 1);
});

test("overall modu, dört ana DEF oyuncusunu iki takıma 2-2 dağıtır", () => {
  const players = [
    player("gk-1", [position("GK", 90, true)]),
    player("gk-2", [position("GK", 70, true)]),
    player("def-1", [position("DEF", 99, true)]),
    player("def-2", [position("DEF", 98, true)]),
    player("def-3", [position("DEF", 60, true)]),
    player("def-4", [position("DEF", 59, true)]),
    ...[88, 86, 84, 82, 80, 78].map((rating, index) =>
      player(`mid-${index}`, [position("MID", rating, true)])
    ),
    player("fwd-1", [position("FWD", 76, true)]),
    player("fwd-2", [position("FWD", 74, true)]),
  ];
  const config = {
    teamSize: 7,
    formation: "1-2-3-1",
    teamAName: "A",
    teamBName: "B",
  };

  const result = generateBalancedTeams(players, config, "overall");

  assert.equal(result.teamA.filter((item) => mainPosition(item) === "DEF").length, 2);
  assert.equal(result.teamB.filter((item) => mainPosition(item) === "DEF").length, 2);
});

test("overall modu, yeniden oluşturmada önceki takım bölünmesini tekrarlamaz", () => {
  const players = [
    player("gk-1", [position("GK", 90, true)]),
    player("gk-2", [position("GK", 90, true)]),
    ...Array.from({ length: 4 }, (_, index) =>
      player(`def-${index}`, [position("DEF", 80, true)])
    ),
    ...Array.from({ length: 6 }, (_, index) =>
      player(`mid-${index}`, [position("MID", 80, true)])
    ),
    player("fwd-1", [position("FWD", 80, true)]),
    player("fwd-2", [position("FWD", 80, true)]),
  ];
  const config = {
    teamSize: 7,
    formation: "1-2-3-1",
    teamAName: "A",
    teamBName: "B",
  };
  const signature = (draft) =>
    [draft.teamA, draft.teamB]
      .map((team) => team.map((item) => item.id).sort().join(","))
      .sort()
      .join("||");
  const defenderSignature = (draft) =>
    [draft.teamA, draft.teamB]
      .map((team) =>
        team
          .filter((item) => mainPosition(item) === "DEF")
          .map((item) => item.id)
          .sort()
          .join(",")
      )
      .sort()
      .join("||");

  const first = generateBalancedTeams(players, config, "overall");
  const second = generateBalancedTeams(players, config, "overall", {
    previousDraft: first,
  });

  assert.notEqual(signature(second), signature(first));
  assert.notEqual(defenderSignature(second), defenderSignature(first));
  assert.equal(second.teamAPower, second.teamBPower);
  assert.equal(second.teamA.filter((item) => mainPosition(item) === "DEF").length, 2);
  assert.equal(second.teamB.filter((item) => mainPosition(item) === "DEF").length, 2);
});

test("overall modu, tek sayılı ana mevki havuzlarında farkı en fazla bir tutar", () => {
  const players = [
    player("gk-1", [position("GK", 90, true)]),
    player("gk-2", [position("GK", 89, true)]),
    ...[88, 77, 66].map((rating, index) =>
      player(`def-${index}`, [position("DEF", rating, true)])
    ),
    ...[87, 76, 65].map((rating, index) =>
      player(`mid-${index}`, [position("MID", rating, true)])
    ),
    player("fwd-1", [position("FWD", 86, true)]),
    player("fwd-2", [position("FWD", 64, true)]),
  ];
  const config = {
    teamSize: 5,
    formation: "1-1-2-1",
    teamAName: "A",
    teamBName: "B",
  };

  const result = generateBalancedTeams(players, config, "overall");

  for (const code of ["GK", "DEF", "MID", "FWD"]) {
    assert.ok(positionDifference(result.teamA, result.teamB, code) <= 1, `${code} dağılımı dengesiz`);
  }
});

test("forvetsiz formasyon, doğal mevki kontenjanı olmayan FWD oyuncularını bildirir", () => {
  const players = [
    player("gk-1", [position("GK", 80, true)]),
    player("gk-2", [position("GK", 79, true)]),
    ...Array.from({ length: 6 }, (_, index) =>
      player(`def-${index}`, [position("DEF", 70 + index, true)])
    ),
    ...Array.from({ length: 4 }, (_, index) =>
      player(`mid-${index}`, [position("MID", 70 + index, true)])
    ),
    player("fwd-1", [position("FWD", 85, true)]),
    player("fwd-2", [position("FWD", 84, true)]),
  ];
  const config = {
    teamSize: 7,
    formation: "1-3-3-0",
    teamAName: "A",
    teamBName: "B",
  };

  assert.deepEqual(analyzeFormationCompatibility(players, config), [{
    position: "FWD",
    playerCount: 2,
    availableSlots: 0,
    overflowCount: 2,
    blocking: false,
  }]);
});

test("FWD kontenjanı yoksa forvet, eşit ratinglerde DEF yerine MID oynar", () => {
  const players = [
    player("gk-1", [position("GK", 90, true)]),
    player("gk-2", [position("GK", 89, true)]),
    ...Array.from({ length: 6 }, (_, index) =>
      player(`def-${index}`, [position("DEF", 80 - index, true)])
    ),
    ...Array.from({ length: 4 }, (_, index) =>
      player(`mid-${index}`, [position("MID", 75 - index, true)])
    ),
    player("fwd-1", [position("FWD", 88, true)]),
    player("fwd-2", [position("FWD", 87, true)]),
  ];
  const config = {
    teamSize: 7,
    formation: "1-3-3-0",
    teamAName: "A",
    teamBName: "B",
  };

  const result = generateBalancedTeams(players, config, "positional");
  const forwards = [...result.teamA, ...result.teamB].filter(
    (item) => mainPosition(item) === "FWD"
  );

  assert.equal(forwards.length, 2);
  assert.ok(forwards.every((item) => item.assignedPosition === "MID"));
});

test("ana FWD oyuncusu kayıtlı MID alternatifiyle eşleşebiliyorsa uyarı verilmez", () => {
  const players = [
    player("gk-1", [position("GK", 90, true)]),
    player("gk-2", [position("GK", 89, true)]),
    ...Array.from({ length: 6 }, (_, index) =>
      player(`def-${index}`, [position("DEF", 80 - index, true)])
    ),
    ...Array.from({ length: 4 }, (_, index) =>
      player(`mid-${index}`, [position("MID", 75 - index, true)])
    ),
    player("flex-1", [position("FWD", 88, true), position("MID", 82)]),
    player("flex-2", [position("FWD", 87, true), position("MID", 81)]),
  ];
  const config = {
    teamSize: 7,
    formation: "1-3-3-0",
    teamAName: "A",
    teamBName: "B",
  };

  assert.deepEqual(analyzeFormationCompatibility(players, config), []);
  for (const mode of ["overall", "positional"]) {
    const result = generateBalancedTeams(players, config, mode);
    const flexiblePlayers = [...result.teamA, ...result.teamB].filter((item) =>
      item.id.startsWith("flex-")
    );
    assert.ok(
      flexiblePlayers.every((item) => item.assignedPosition === "MID"),
      `${mode} modu kayıtlı MID alternatifini kullanmalı`
    );
  }
});

test("ana mevkisi GK olan oyuncu hiçbir koşulda saha mevkisine atanmaz", () => {
  const players = [
    player("gk-1", [position("GK", 90, true), position("DEF", 85)]),
    player("gk-2", [position("GK", 89, true), position("MID", 84)]),
    player("gk-3", [position("GK", 88, true), position("FWD", 83)]),
    ...Array.from({ length: 11 }, (_, index) =>
      player(`field-${index}`, [position(index < 6 ? "DEF" : "MID", 80 - index, true)])
    ),
  ];
  const config = {
    teamSize: 7,
    formation: "1-3-3-0",
    teamAName: "A",
    teamBName: "B",
  };

  assert.deepEqual(analyzeFormationCompatibility(players, config), [{
    position: "GK",
    playerCount: 3,
    availableSlots: 2,
    overflowCount: 1,
    blocking: true,
  }]);
  assert.throws(
    () => generateBalancedTeams(players, config, "positional"),
    /Ana mevkisi kaleci/
  );
});

test("uygun ana mevki slotları varken DEF ve FWD oyuncuları çapraz atanmaz", () => {
  const players = [
    player("gk-1", [position("GK", 99, true)]),
    player("gk-2", [position("GK", 98, true)]),
    player("bayram", [position("DEF", 50, true), position("FWD", 50)]),
    ...[89, 85, 75].map((rating, index) =>
      player(`def-${index}`, [position("DEF", rating, true)])
    ),
    ...[88, 84, 82, 80, 78, 76].map((rating, index) =>
      player(`mid-${index}`, [position("MID", rating, true)])
    ),
    player("mehmet", [position("FWD", 80, true), position("DEF", 80)]),
    player("fwd-2", [position("FWD", 79, true)]),
  ];
  const config = {
    teamSize: 7,
    formation: "1-2-3-1",
    teamAName: "A",
    teamBName: "B",
  };

  for (const mode of ["overall", "positional"]) {
    const result = generateBalancedTeams(players, config, mode);
    const draftedPlayers = [...result.teamA, ...result.teamB];
    const mehmet = draftedPlayers.find((item) => item.id === "mehmet");
    const bayram = draftedPlayers.find((item) => item.id === "bayram");

    assert.equal(mehmet?.assignedPosition, "FWD", `${mode}: Mehmet FWD kalmalı`);
    assert.equal(bayram?.assignedPosition, "DEF", `${mode}: Bayram DEF kalmalı`);
    for (const team of [result.teamA, result.teamB]) {
      assert.equal(team.filter((item) => item.assignedPosition === "GK").length, 1);
      assert.equal(team.filter((item) => item.assignedPosition === "DEF").length, 2);
      assert.equal(team.filter((item) => item.assignedPosition === "MID").length, 3);
      assert.equal(team.filter((item) => item.assignedPosition === "FWD").length, 1);
    }
  }
});

test("mevki modu, güçlü alternatif DEF ratingini formasyon ihtiyacında kullanır", () => {
  const players = [
    player("gk-1", [position("GK", 90, true)]),
    player("gk-2", [position("GK", 89, true)]),
    ...[84, 82, 78].map((rating, index) =>
      player(`def-${index}`, [position("DEF", rating, true)])
    ),
    player("furkan", [position("MID", 80, true), position("DEF", 85)]),
    ...[83, 81, 79, 77, 75, 73].map((rating, index) =>
      player(`mid-${index}`, [position("MID", rating, true)])
    ),
    player("fwd-1", [position("FWD", 86, true)]),
    player("fwd-2", [position("FWD", 76, true)]),
  ];
  const config = {
    teamSize: 7,
    formation: "1-2-3-1",
    teamAName: "A",
    teamBName: "B",
  };

  const result = generateBalancedTeams(players, config, "positional");
  const draftedPlayers = [...result.teamA, ...result.teamB];
  const furkan = draftedPlayers.find((item) => item.id === "furkan");

  assert.equal(furkan?.assignedPosition, "DEF");
  assert.equal(furkan?.effectiveRating, 85);
  for (const team of [result.teamA, result.teamB]) {
    assert.equal(team.filter((item) => item.assignedPosition === "GK").length, 1);
    assert.equal(team.filter((item) => item.assignedPosition === "DEF").length, 2);
    assert.equal(team.filter((item) => item.assignedPosition === "MID").length, 3);
    assert.equal(team.filter((item) => item.assignedPosition === "FWD").length, 1);
  }
});

test("rastgele mod, rating dengesi aramadan eşit ve geçerli iki takım oluşturur", () => {
  const players = [
    player("gk-1", [position("GK", 99, true)]),
    player("gk-2", [position("GK", 60, true)]),
    ...Array.from({ length: 4 }, (_, index) =>
      player(`def-${index}`, [position("DEF", 95 - index * 10, true)])
    ),
    ...Array.from({ length: 6 }, (_, index) =>
      player(`mid-${index}`, [position("MID", 90 - index * 5, true)])
    ),
    player("fwd-1", [position("FWD", 98, true)]),
    player("fwd-2", [position("FWD", 55, true)]),
  ];
  const config = {
    teamSize: 7,
    formation: "1-2-3-1",
    teamAName: "A",
    teamBName: "B",
  };

  const result = generateBalancedTeams(players, config, "random");

  assert.equal(result.teamA.length, 7);
  assert.equal(result.teamB.length, 7);
  assert.equal(new Set([...result.teamA, ...result.teamB].map((item) => item.id)).size, 14);
  for (const team of [result.teamA, result.teamB]) {
    assert.equal(team.filter((item) => item.assignedPosition === "GK").length, 1);
    assert.equal(team.filter((item) => item.assignedPosition === "DEF").length, 2);
    assert.equal(team.filter((item) => item.assignedPosition === "MID").length, 3);
    assert.equal(team.filter((item) => item.assignedPosition === "FWD").length, 1);
  }
});

test("OVR ve mevki modları, gerçekçi ratinglerde önceki DEF eşleşmesini değiştirir", () => {
  const players = [
    player("gokhan-b", [position("GK", 99, true)]),
    player("gokhan-i", [position("GK", 99, true)]),
    player("kadir", [position("DEF", 75, true)]),
    player("tuna", [position("DEF", 85, true)]),
    player("bayram", [position("DEF", 50, true)]),
    player("salim", [position("DEF", 89, true)]),
    player("cakir", [position("MID", 80, true)]),
    player("fatih", [position("MID", 80, true)]),
    player("ozcan", [position("MID", 75, true)]),
    player("huseyin", [position("MID", 80, true)]),
    player("furkan", [position("MID", 80, true)]),
    player("anil", [position("MID", 80, true)]),
    player("aytac", [position("FWD", 75, true)]),
    player("mehmet", [position("FWD", 80, true)]),
  ];
  const config = {
    teamSize: 7,
    formation: "1-2-3-1",
    teamAName: "A",
    teamBName: "B",
  };
  const defenderSignature = (draft) =>
    [draft.teamA, draft.teamB]
      .map((team) =>
        team
          .filter((item) => item.assignedPosition === "DEF")
          .map((item) => item.id)
          .sort()
          .join(",")
      )
      .sort()
      .join("||");

  for (const mode of ["overall", "positional"]) {
    const first = generateBalancedTeams(players, config, mode);
    const second = generateBalancedTeams(players, config, mode, {
      previousDraft: first,
    });

    assert.notEqual(
      defenderSignature(second),
      defenderSignature(first),
      `${mode}: savunma eşleşmesi değişmeli`
    );
    assert.ok(
      Math.abs(second.teamAPower - second.teamBPower) <= 3,
      `${mode}: takım ortalama farkı 3.0 sınırını aşmamalı`
    );
  }
});
