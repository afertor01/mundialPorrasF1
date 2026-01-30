export const getTrackImage = (gpName: string): string => {
  if (!gpName) return "/tracks/bahrain.png"; // Fallback por seguridad
  const name = gpName.toLowerCase();

  if (name.includes("bahrain") || name.includes("barein") || name.includes("baréin")) return "/tracks/bahrain.png";
  if (name.includes("saudi") || name.includes("arabia")) return "/tracks/saudi.png";
  if (name.includes("australia")) return "/tracks/australia.png";
  if (name.includes("japón") || name.includes("japan")) return "/tracks/japan.png";
  if (name.includes("china")) return "/tracks/china.png";
  if (name.includes("miami")) return "/tracks/miami.png";
  if (name.includes("emilia") || name.includes("imola")) return "/tracks/imola.png";
  if (name.includes("mónaco") || name.includes("monaco")) return "/tracks/monaco.png";
  if (name.includes("canadá") || name.includes("canada")) return "/tracks/canada.png";
  if (name.includes("españa") || name.includes("barcelona") || name.includes("spain")) return "/tracks/barcelona.png";
  if (name.includes("austria")) return "/tracks/austria.png";
  if (name.includes("bretaña") || name.includes("silverstone") || name.includes("britain")) return "/tracks/britain.png";
  if (name.includes("hungría") || name.includes("hungary")) return "/tracks/hungary.png";
  if (name.includes("bélgica") || name.includes("francorchamps") || name.includes("belgium")) return "/tracks/belgium.png";
  if (name.includes("bajos") || name.includes("holanda") || name.includes("netherlands")) return "/tracks/netherlands.png";
  if (name.includes("italy") || name.includes("monza")  || name.includes("italia")) return "/tracks/monza.png";
  if (name.includes("azerba") || name.includes("baku")) return "/tracks/baku.png";
  if (name.includes("singapur")) return "/tracks/singapore.png";
  if (name.includes("usa") || name.includes("austin")) return "/tracks/usa.png";
  if (name.includes("xico")) return "/tracks/mexico.png";
  if (name.includes("brasil")) return "/tracks/brazil.png";
  if (name.includes("vegas")) return "/tracks/vegas.png";
  if (name.includes("qatar")) return "/tracks/qatar.png";
  if (name.includes("dhabi")) return "/tracks/abudhabi.png";

  return "/tracks/bahrain.png"; // Imagen por defecto
};