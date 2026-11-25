/* Short, well-established medical facts shown while DxDrill is loading. Keep each one true, plain and short. */
(function () {
  var DX = window.DX;
  DX.nuggets = [
    "The heart beats about 100,000 times a day.",
    "The stapes, in the middle ear, is the smallest bone in the body, about 3 mm long.",
    "The femur is the longest bone in the body.",
    "Adults have 206 bones. Babies are born with many more, because several fuse as they grow.",
    "The \"funny bone\" feeling is the ulnar nerve being pressed against the medial epicondyle of the humerus.",
    "Red blood cells live for about 120 days. Platelets last only about 7 to 10 days.",
    "Stomach acid is very acidic, around pH 1.5 to 3.5.",
    "The liver can regenerate after part of it is removed.",
    "Each kidney has about a million nephrons.",
    "The kidneys receive roughly a fifth of the cardiac output at rest.",
    "The brain is about 2% of body weight but uses about 20% of the body's resting energy.",
    "The phrenic nerve (C3, C4, C5) supplies the diaphragm: \"C3, 4, 5 keeps the diaphragm alive\".",
    "The skin is the largest organ of the body.",
    "The cornea has no blood vessels. It gets its oxygen from the air and from tears.",
    "Cartilage has no blood supply of its own, which is one reason it heals slowly.",
    "The right lung has three lobes and the left has two, because the heart takes up space on the left.",
    "The gluteus maximus is the largest muscle in the body by mass.",
    "The vagus nerve (CN X) is called the \"wandering nerve\" because it travels from the brainstem to the abdomen.",
    "Insulin was first given to a patient in 1922, after its discovery by Banting and Best.",
    "Penicillin was discovered by Alexander Fleming in 1928.",
    "A normal adult resting heart rate is about 60 to 100 beats a minute.",
    "The hypothalamus works as the body's thermostat.",
    "Each haemoglobin molecule can carry up to four molecules of oxygen.",
    "Carbon monoxide binds haemoglobin over 200 times more strongly than oxygen does.",
    "A Smith fracture is sometimes called a \"reverse Colles\": the distal radius fragment is displaced toward the palm.",
    "Erb's palsy (C5, C6) gives the \"waiter's tip\" posture. Klumpke's palsy involves C8 and T1.",
    "Wrist drop is the classic sign of a radial nerve injury.",
    "The scaphoid's blood supply enters from its distal end, so a waist fracture can cause avascular necrosis of the proximal part.",
    "Tenderness in the anatomical snuffbox after a fall on the hand should make you think of a scaphoid fracture.",
    "Humans have 23 pairs of chromosomes, 46 in all.",
    "The heart starts to beat around the fourth week of development.",
    "Folic acid taken before and in early pregnancy lowers the risk of neural tube defects.",
    "Mitochondria have their own DNA, and it is inherited from the mother.",
    "Sickle cell trait gives some protection against severe malaria.",
    "Group O negative red cells can be given to patients of any ABO and Rh group in an emergency.",
    "The knee jerk tests mainly the L3 and L4 spinal levels.",
    "An adult has about 5 litres of blood.",
    "The lungs have hundreds of millions of alveoli, where gas exchange happens.",
    "A patent foramen ovale is found in about a quarter of adults, and most never know about it."
  ];
  var last = -1;
  DX.nugget = function () {
    var n = DX.nuggets.length, i = Math.floor(Math.random() * n);
    if (n > 1 && i === last) i = (i + 1) % n;
    last = i; return DX.nuggets[i];
  };
})();
