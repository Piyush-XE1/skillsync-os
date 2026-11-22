import { describe, expect, it } from "vitest";
import {
  cleanPersonInput,
  filterPeople,
  personDetails,
  personMeta,
  personTagPalette,
  sortPeople,
} from "@/lib/people";
import type { Person } from "@/lib/schema";

const person = (patch: Partial<Person> & { name: string }): Person => ({
  id: patch.name,
  tags: [],
  createdAt: 1,
  updatedAt: 1,
  ...patch,
});

describe("people records", () => {
  it("omits blank fields instead of storing empty strings", () => {
    const record = cleanPersonInput(
      {
        name: "  Rahul  ",
        howMet: " College ",
        liked: "   ",
        learned: "Stay consistent",
        tags: ["College", "college"],
      },
      { id: "p1", now: 100 },
    );
    expect(record).toEqual({
      id: "p1",
      name: "Rahul",
      howMet: "College",
      learned: "Stay consistent",
      tags: ["College"],
      createdAt: 100,
      updatedAt: 100,
    });
    expect("liked" in record).toBe(false);
  });

  it("only exposes populated sections in the normal view", () => {
    const sparse = person({ name: "Rahul", howMet: "College" });
    expect(personMeta(sparse)).toEqual(["College"]);
    expect(personDetails(sparse).map((field) => field.key)).toEqual(["howMet"]);

    const full = person({
      name: "Mehta",
      dateMet: "2026-09-14",
      liked: "Patient",
      disliked: "Interrupted others",
      learned: "Ask the second question",
      talkedAbout: "Research",
      locationContext: "Canteen",
      followUp: "Send the book",
      tags: ["Mentor"],
    });
    expect(personDetails(full).map((field) => field.key)).toEqual([
      "dateMet",
      "liked",
      "disliked",
      "learned",
      "talkedAbout",
      "locationContext",
      "followUp",
      "tags",
    ]);
  });

  it("derives tag suggestions from entries without a tag database", () => {
    expect(
      personTagPalette([
        person({ name: "A", tags: ["College", "Mentor"] }),
        person({ name: "B", tags: ["college", "Friend"] }),
      ]),
    ).toEqual(["College", "Mentor", "Friend"]);
  });

  it("searches populated text and sorts by recency or name", () => {
    const people = [
      person({
        name: "Zoya",
        howMet: "College",
        dateMet: "2026-01-01",
        tags: ["College"],
        createdAt: 10,
      }),
      person({ name: "Aman", learned: "Stay consistent", dateMet: "2026-10-01", createdAt: 20 }),
      person({ name: "Noor", dateMet: undefined, createdAt: 30 }),
    ];
    expect(filterPeople(people, "consistent", null).map((p) => p.name)).toEqual(["Aman"]);
    expect(filterPeople(people, "", "College").map((p) => p.name)).toEqual(["Zoya"]);
    expect(sortPeople(people, "recent").map((p) => p.name)).toEqual(["Aman", "Zoya", "Noor"]);
    expect(sortPeople(people, "alphabetical").map((p) => p.name)).toEqual(["Aman", "Noor", "Zoya"]);
    expect(sortPeople(people, "added").map((p) => p.name)).toEqual(["Noor", "Aman", "Zoya"]);
  });
});
