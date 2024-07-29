import os

from monitoring import parse_st, cleanup


def get_addresses(b):
    for debug_data in b:
        if (debug_data.location.find("IX")) > 0:
            # Reading Input Status
            mb_address = debug_data.location.split("%IX")[1].split(".")
            result = int(mb_address[0]) * 8 + int(mb_address[1])
            debug_data.value = ["IX", result]

        elif (debug_data.location.find("QX")) > 0:
            # Reading Coils
            mb_address = debug_data.location.split("%QX")[1].split(".")
            result = int(mb_address[0]) * 8 + int(mb_address[1])
            debug_data.value = ["QX", result]

        elif (debug_data.location.find("IW")) > 0:
            # Reading Input Registers
            mb_address = debug_data.location.split("%IW")[1]
            result = int(mb_address)
            debug_data.value = ["IW", result]

        elif (debug_data.location.find("QW")) > 0:
            # Reading Holding Registers
            mb_address = debug_data.location.split("%QW")[1]
            result = int(mb_address)
            debug_data.value = ["QW", result]

        elif (debug_data.location.find("MW")) > 0:
            # Reading Word Memory
            mb_address = debug_data.location.split("%MW")[1]
            result = int(mb_address) + 1021
            debug_data.value = ["MW", result]

        elif (debug_data.location.find("MD")) > 0:
            # Reading Double Memory
            mb_address = debug_data.location.split("%MD")[1]
            result = (int(mb_address) * 2) + 2042
            debug_data.value = ["MD", result]

        elif (debug_data.location.find("ML")) > 0:
            # Reading Long Memory
            mb_address = debug_data.location.split("%ML")[1]
            result = int(mb_address) * 4 + 4096
            debug_data.value = ["ML", result]


sts = os.listdir("./st_files")

for a in sts:
    # GETS DATA FROM FILE
    b = parse_st(a)
    get_addresses(b)

    # BUILDS RESULTS LIST
    results = []
    for debugs in b:
        results.append([debugs.value, debugs.name, debugs.type])

    results_sorted = []

    # SORTED BY ADDRESS TYPE
    r_IX = []
    r_QX = []
    r_IW = []
    r_QW = []
    r_MW = []
    r_MD = []
    r_ML = []
    for i in results:
        if i[0][0] == "IX":
            r_IX.append(i)
        elif i[0][0] == "QX":
            r_QX.append(i)
        elif i[0][0] == "IW":
            r_IW.append(i)
        elif i[0][0] == "QW":
            r_QW.append(i)
        elif i[0][0] == "MD":
            r_MD.append(i)
        elif i[0][0] == "ML":
            r_ML.append(i)
        elif i[0][0] == "MW":
            r_MW.append(i)

    # SORTS BY ADDRESS VALUE
    new_r_IX = sorted(r_IX, key=lambda x: x[0][1])
    new_r_QX = sorted(r_QX, key=lambda x: x[0][1])
    new_r_IW = sorted(r_IW, key=lambda x: x[0][1])
    new_r_QW = sorted(r_QW, key=lambda x: x[0][1])
    new_r_MD = sorted(r_MD, key=lambda x: x[0][1])
    new_r_ML = sorted(r_ML, key=lambda x: x[0][1])
    new_r_MW = sorted(r_MW, key=lambda x: x[0][1])

    results_sorted = (
        new_r_IX + new_r_QX + new_r_IW + new_r_QW + new_r_MD + new_r_ML + new_r_MW
    )
    # PRINTS IT OUT
    print(f"{a} addresses:")
    print("------------------------------------")
    for i in results_sorted:
        print(i)
    print("====================================")

    cleanup()
