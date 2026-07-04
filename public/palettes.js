/*
 * Bead color palettes. Hex values are community-sourced screen approximations;
 * they must be re-calibrated against physical beads before we advertise
 * color accuracy (see docs/PRD.md §10.3).
 *
 * Structure supports multiple brands (Artkal planned for the self-operated kits).
 */
const PALETTES = {
  perler: {
    name: "Perler",
    colors: [
      { code: "P01", name: "White", hex: "#F8F8F8" },
      { code: "P02", name: "Light Gray", hex: "#C9CDCE" },
      { code: "P03", name: "Gray", hex: "#8E9294" },
      { code: "P04", name: "Dark Gray", hex: "#57595B" },
      { code: "P05", name: "Black", hex: "#362F2D" },
      { code: "P06", name: "Cream", hex: "#F0E9BB" },
      { code: "P07", name: "Yellow", hex: "#F6DF35" },
      { code: "P08", name: "Cheddar", hex: "#FFB63C" },
      { code: "P09", name: "Orange", hex: "#FF7723" },
      { code: "P10", name: "Butterscotch", hex: "#DE9435" },
      { code: "P11", name: "Hot Coral", hex: "#FF4A54" },
      { code: "P12", name: "Red", hex: "#C22D33" },
      { code: "P13", name: "Cranapple", hex: "#953343" },
      { code: "P14", name: "Magenta", hex: "#F25292" },
      { code: "P15", name: "Bubblegum", hex: "#FF6EA2" },
      { code: "P16", name: "Pink", hex: "#FFA9CE" },
      { code: "P17", name: "Light Pink", hex: "#F9C6CF" },
      { code: "P18", name: "Peach", hex: "#FEDCB9" },
      { code: "P19", name: "Salmon", hex: "#FF9E8D" },
      { code: "P20", name: "Sand", hex: "#EDC9A5" },
      { code: "P21", name: "Fawn", hex: "#D8A373" },
      { code: "P22", name: "Light Brown", hex: "#A87748" },
      { code: "P23", name: "Rust", hex: "#8B4A3C" },
      { code: "P24", name: "Brown", hex: "#5A3B31" },
      { code: "P25", name: "Purple", hex: "#6A4E9E" },
      { code: "P26", name: "Plum", hex: "#A54FA1" },
      { code: "P27", name: "Lavender", hex: "#B79FD1" },
      { code: "P28", name: "Pastel Lavender", hex: "#C6B6E0" },
      { code: "P29", name: "Dark Blue", hex: "#2A3B7F" },
      { code: "P30", name: "Cobalt", hex: "#1560A8" },
      { code: "P31", name: "Light Blue", hex: "#3FA8DE" },
      { code: "P32", name: "Pastel Blue", hex: "#A9CBEB" },
      { code: "P33", name: "Robin's Egg", hex: "#ACD8DE" },
      { code: "P34", name: "Turquoise", hex: "#0FA0BE" },
      { code: "P35", name: "Parrot Green", hex: "#109E8B" },
      { code: "P36", name: "Dark Green", hex: "#14734A" },
      { code: "P37", name: "Green", hex: "#199D53" },
      { code: "P38", name: "Bright Green", hex: "#63C654" },
      { code: "P39", name: "Kiwi Lime", hex: "#86C440" },
      { code: "P40", name: "Pastel Green", hex: "#8BDA9B" },
      { code: "P41", name: "Prickly Pear", hex: "#C7D93D" },
      { code: "P42", name: "Toothpaste", hex: "#C7E8E4" },
      { code: "P43", name: "Gold", hex: "#B78D4C" }
    ]
  }
};
