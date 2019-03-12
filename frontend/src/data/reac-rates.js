
const reactionRates = {
  k1Noff: '1.000000e+00',
  k1Coff: '1.000000e+00',
  kCBoff: '1.000000e+00',
  kf_camkii_cam_014: '1.000000e+00',
  kf_camkii_cam_013: '1.000000e+00',
  kr1f: '1.000000e+00',
  kr3f: '1.000000e+00',
  kr4f: '1.000000e+00',
  kr6f: '1.000000e+00',
  kr7f: '1.000000e+00',
  kr8f: '1.000000e+00',
  k_0: '0.000000e+00',
  kr18p: '5.000000e-01',
  kr18m: '0.000000e+00',
  kr19p: '2.000000e-03',
  kr19m: '0.000000e+00',
  kr20p: '5.000000e-01',
  kr20m: '0.000000e+00',
  kr21p: '2.000000e-02',
  kr21m: '0.000000e+00',
  kr22p: '7.700000e-04',
  kr22m: '0.000000e+00',
  kr23p: '1.600000e-04',
  kr23m: '0.000000e+00',
  kr24p: '1.000000e+00',
  kr24m: '0.000000e+00',
  kr25p: '1.000000e-01',
  kr25m: '0.000000e+00',
  kr26p: '1.000000e+01',
  kr26m: '0.000000e+00',
  kr27p: '1.000000e-02',
  kr27m: '0.000000e+00',
  kr28p: '1.000000e-01',
  kr28m: '0.000000e+00',
  kr29p: '1.000000e-04',
  kr29m: '0.000000e+00',
  kr30p: '1.000000e+00',
  kr30m: '5.000000e-03',
  kr31p: '1.000000e+00',
  kr31m: '1.000000e-02',
  kr32p: '2.000000e-02',
  kr32m: '0.000000e+00',
  kr33p: '1.000000e+00',
  kr33m: '1.000000e-02',
  kr34p: '1.000000e+00',
  kr34m: '1.000000e-02',
  kr35p: '1.000000e+00',
  kr35m: '1.000000e-02',
  kr36p: '1.000000e+00',
  kr36m: '1.000000e-02',
  kr37p: '1.000000e+00',
  kr37m: '1.000000e-02',
  kr38p: '1.000000e+00',
  kr38m: '1.000000e-02',
  kr39p: '1.000000e+00',
  kr39m: '1.000000e-02',
  kr40p: '1.000000e+00',
  kr40m: '1.000000e-02',
  kr41p: '1.000000e+00',
  kr41m: '1.000000e-02',
  kr42p: '1.000000e+00',
  kr42m: '1.000000e-02',
  kr43p: '1.000000e+00',
  kr43m: '1.000000e-02',
  kr44p: '1.000000e+00',
  kr44m: '1.000000e-02',
  kr45p: '1.000000e+00',
  kr45m: '1.000000e-02',
  kr46p: '1.000000e+00',
  kr46m: '1.000000e-02',
  kr47p: '1.000000e+00',
  kr47m: '1.000000e-02',
  kr48p: '1.000000e+00',
  kr48m: '1.000000e-02',
  kr49p: '1.000000e+00',
  kr49m: '1.000000e-02',
  kr50p: '1.000000e+00',
  kr50m: '1.000000e-02',
  kr51p: '1.000000e+00',
  kr51m: '1.000000e-02',
  kr52p: '1.000000e+00',
  kr52m: '1.000000e-02',
  kr53p: '1.000000e+00',
  kr53m: '1.000000e-02',
  kr54p: '1.000000e+00',
  kr54m: '1.000000e-02',
  kr55p: '1.000000e+00',
  kr55m: '1.000000e-02',
  kr56p: '1.000000e+00',
  kr56m: '1.000000e-02',
  kr57p: '1.000000e+00',
  kr57m: '1.000000e-02',
  kr58p: '1.000000e+00',
  kr58m: '1.000000e-02',
  kr59p: '1.000000e+00',
  kr59m: '1.000000e-02',
  kr60p: '1.000000e+00',
  kr60m: '1.000000e-02',
  kr61p: '1.000000e+00',
  kr61m: '1.000000e-02',
  kr62p: '1.000000e+00',
  kr62m: '1.000000e-02',
  kr63p: '1.000000e+00',
  kr63m: '1.000000e-02',
  kr64p: '1.000000e+00',
  kr64m: '1.000000e-02',
  kr65p: '1.000000e+00',
  kr65m: '1.000000e-02',
  kr66p: '1.000000e+00',
  kr66m: '1.000000e-02',
  kr67p: '1.000000e+00',
  kr67m: '1.000000e-02',
  kr68p: '1.000000e+00',
  kr68m: '1.000000e-02',
  kr69p: '1.000000e+00',
  kr69m: '1.000000e-02',
  kr70p: '1.000000e+00',
  kr70m: '1.000000e-02',
  kr71p: '1.000000e+00',
  kr71m: '1.000000e-02',
  kr72p: '1.000000e+00',
  kr72m: '1.000000e-02',
  kr73p: '1.000000e+00',
  kr73m: '1.000000e-02',
  kr74p: '1.000000e+00',
  kr74m: '1.000000e-02',
  kr75p: '1.000000e+00',
  kr75m: '1.000000e-02',
  kr76p: '1.000000e+00',
  kr76m: '1.000000e-02',
  kr77p: '1.000000e+00',
  kr77m: '1.000000e-02',
  kr78p: '1.000000e+00',
  kr78m: '1.000000e-02',
  kr79p: '1.000000e+00',
  kr79m: '1.000000e-02',
  kr80p: '1.000000e+00',
  kr80m: '1.000000e-02',
  kr81p: '1.000000e+00',
  kr81m: '1.000000e-02',
  kr82p: '1.000000e+00',
  kr82m: '1.000000e-02',
  kr83p: '1.000000e+00',
  kr83m: '1.000000e-02',
  kr84p: '1.000000e+00',
  kr84m: '1.000000e-02',
  kr85p: '1.000000e+00',
  kr85m: '1.000000e-02',
  kr86p: '1.000000e+00',
  kr86m: '1.000000e-02',
  kr87p: '1.000000e+00',
  kr87m: '1.000000e-02',
  kr88p: '1.000000e+00',
  kr88m: '1.000000e-02',
  kr89p: '1.000000e+00',
  kr89m: '1.000000e-02',
  kr90p: '1.000000e+00',
  kr90m: '1.000000e-02',
  kr91p: '1.000000e+00',
  kr91m: '1.000000e-02',
  kr92p: '1.000000e+00',
  kr92m: '1.000000e-02',
  kr93p: '1.000000e+00',
  kr93m: '1.000000e-02',
  kr94p: '1.000000e+00',
  kr94m: '1.000000e-02',
  kr95p: '1.000000e+00',
  kr95m: '1.000000e-02',
  kr96p: '1.000000e+00',
  kr96m: '1.000000e-02',
  kr97p: '1.000000e+00',
  kr97m: '1.000000e-02',
  kr98p: '1.000000e+00',
  kr98m: '1.000000e-02',
  kr99p: '1.000000e+00',
  kr99m: '1.000000e-02',
  kr100p: '1.000000e+00',
  kr100m: '1.000000e-02',
  kr101p: '1.000000e+00',
  kr101m: '1.000000e-02',
  kr102p: '1.000000e+00',
  kr102m: '1.000000e-02',
  kr103p: '1.000000e+00',
  kr103m: '1.000000e-02',
  kr104p: '1.000000e+00',
  kr104m: '1.000000e-02',
  kr105p: '1.000000e+00',
  kr105m: '1.000000e-02',
  kr106p: '1.000000e+00',
  kr106m: '1.000000e-02',
  kr107p: '1.000000e+00',
  kr107m: '1.000000e-02',
  kr108p: '1.000000e+00',
  kr108m: '1.000000e-02',
  kr109p: '1.000000e+00',
  kr109m: '1.000000e-02',
  kr110p: '1.000000e+00',
  kr110m: '1.000000e-02',
  kr111p: '1.000000e+00',
  kr111m: '1.000000e-02',
  kr112p: '1.000000e+00',
  kr112m: '1.000000e-02',
  kr113p: '1.000000e+00',
  kr113m: '1.000000e-02',
  kr114p: '1.000000e+00',
  kr114m: '1.000000e-02',
  kr115p: '1.000000e+00',
  kr115m: '1.000000e-02',
  kr116p: '1.000000e+00',
  kr116m: '1.000000e-02',
  kr117p: '1.000000e+00',
  kr117m: '1.000000e-02',
  kr118p: '1.000000e+00',
  kr118m: '1.000000e-02',
  kr119p: '1.000000e+00',
  kr119m: '1.000000e-02',
  kr120p: '1.000000e+00',
  kr120m: '1.000000e-02',
  kr121p: '1.000000e+00',
  kr121m: '1.000000e-02',
  kr122p: '1.000000e+00',
  kr122m: '1.000000e-02',
  kr123p: '1.000000e+00',
  kr123m: '1.000000e-02',
  kr124p: '1.000000e+00',
  kr124m: '1.000000e-02',
  kr125p: '1.000000e+00',
  kr125m: '1.000000e-02',
  kr126p: '1.000000e+00',
  kr126m: '1.000000e-02',
  kr127p: '1.000000e+00',
  kr127m: '1.000000e-02',
  kr128p: '1.000000e+00',
  kr128m: '1.000000e-02',
  kr129p: '1.000000e+00',
  kr129m: '1.000000e-02',
};

export default reactionRates;
