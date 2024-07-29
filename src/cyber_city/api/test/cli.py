"""
This file is used to test the connection to the modbus server and read/write to the modbus addresses.

Requirements:
- pymodus
- argparse

Features:
- Read and write to modbus registers
- Read and write to modbus coils
- Read modbus input registers
- Read modbus discrete inputs
"""

import argparse
from pymodbus.client import ModbusTcpClient as ModbusClient


def read_coils(client: ModbusClient, start_addr: int, end_addr: int) -> list:
    """
    Read the values of the coils from the modbus server.

    Parameters:
    - client: Modbus client
    - start_addr: Starting address of the coils
    - end_addr: Ending address of the coils
    - num_coils: Number of coils to read

    Returns:
    - List of values of the coils
    """
    response = client.read_coils(start_addr, end_addr - start_addr + 1)
    return response.bits[: end_addr - start_addr + 1]


def write_coils(
    client: ModbusClient, start_addr: int, end_addr: int, value: int
) -> None:
    """
    Write the value to the coils.

    Parameters:
    - client: Modbus client
    - start_addr: Starting address of the coils
    - end_addr: Ending address of the coils
    - value: Value to write to the coils
    """

    client.write_coils(start_addr, [value] * (end_addr - start_addr + 1))
    return None


def read_discrete_inputs(client: ModbusClient, start_addr: int, end_addr: int) -> list:
    """
    Read the values of the discrete inputs from the modbus server.

    Parameters:
    - client: Modbus client
    - start_addr: Starting address of the discrete inputs
    - end_addr: Ending address of the discrete inputs
    - num_coils: Number of discrete inputs to read

    Returns:
    - List of values of the discrete inputs
    """
    response = client.read_discrete_inputs(start_addr, end_addr - start_addr + 1)
    return response.bits[: end_addr - start_addr + 1]


def read_input_registers(client: ModbusClient, start_addr: int, end_addr: int) -> list:
    """
    Read the values of the input registers from the modbus server.

    Parameters:
    - client: Modbus client
    - start_addr: Starting address of the input registers
    - end_addr: Ending address of the input registers
    - num_coils: Number of input registers to read

    Returns:
    - List of values of the input registers
    """
    response = client.read_input_registers(start_addr, end_addr - start_addr + 1)
    return response.registers[: end_addr - start_addr + 1]


def read_holding_register(client: ModbusClient, start_addr: int, end_addr: int) -> list:
    """
    Read the values of the holding registers from the modbus server.

    Parameters:
    - client: Modbus client
    - start_addr: Starting address of the holding registers
    - end_addr: Ending address of the holding registers
    - num_coils: Number of holding registers to read

    Returns:
    - List of values of the holding registers
    """
    response = client.read_holding_registers(start_addr, end_addr - start_addr + 1)
    return response.registers[: end_addr - start_addr + 1]


def write_holding_register(client: ModbusClient, start_addr: int, value: int) -> None:
    """
    Write the value to the holding registers.

    Parameters:
    - client: Modbus client
    - start_addr: Starting address of the holding registers
    - end_addr: Ending address of the holding registers
    - value: Value to write to the holding registers
    """

    client.write_register(start_addr, value)
    return None


def run_modbus(ip_address, modbus_method, start, end, value):
    """
    Run the modbus client. This is the main function that is called from the command line.

    Args:
        ip_address (str): ip address of the modbus server
        modbus_method (str): modbus method to use
        start (int): starting address
        end (int): ending address
        value (int): value to write

    Returns:
        list: list of values
    """
    print(ip_address, modbus_method, start, end, value)

    client = ModbusClient(ip_address, port=502)

    if not end > start:
        end = start

    if modbus_method == "read_coils":
        result = read_coils(client, start, end)
        print(f"Successfully read coils {start} to {end}")
        print(f"Result: \n{result}")
        return result
    elif modbus_method == "write_coils":
        if end == 0:
            end = start + 1
        write_coils(client, start, end, value)
        print(f"Successfully wrote {value} to coils {start} to {end}")
        return result
    elif modbus_method == "read_discrete_inputs":
        if end == 0:
            end = start + 1
        result = read_discrete_inputs(client, start, end)
        print(f"Successfully read discrete inputs {start} to {end}")
        print(f"Result: \n{result}")
        return result
    elif modbus_method == "read_input_registers":
        if end == 0:
            end = start + 1
        result = read_input_registers(client, start, end)
        print(f"Successfully read input registers {start} to {end}")
        print(f"Result: \n{result}")
        return result
    elif modbus_method == "read_holding_register":
        if end == 0:
            end = start + 1
        result = read_holding_register(client, start, end)
        print(result)
        return result
    elif modbus_method == "write_holding_register":
        if end == 0:
            end = start + 1
        write_holding_register(client, start, value)
        print(f"Successfully wrote {value} to holding register {start}")
        return result
    else:
        print("Invalid modbus method")


methods = [
    "read_coils",
    "write_coils",
    "read_discrete_inputs",
    "read_input_registers",
    "read_holding_register",
    "write_holding_register",
]

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Test the connection to the modbus server and read/write to the modbus addresses.",
    )

    parser.add_argument(
        "-i",
        "--ip",
        dest="ip_address",
        type=str,
        help="IP address of the modbus server",
        default="127.0.0.1",
        required=True,
    )

    parser.add_argument(
        "-m",
        "--method",
        dest="modbus_method",
        type=str,
        help="Modbus method to use",
        default="read_coils",
        choices=methods,
        required=True,
    )

    parser.add_argument(
        "-s",
        "--start",
        dest="start",
        type=int,
        help="Starting address of the modbus address",
        default=0,
        required=True,
    )

    parser.add_argument(
        "-e",
        "--end",
        dest="end",
        type=int,
        help="Ending address of the modbus address",
        default=0,
    )

    parser.add_argument(
        "-v",
        "--value",
        dest="value",
        type=int,
        help="Value to write to the modbus address",
        default=0,
    )

    args = parser.parse_args()

    run_modbus(args.ip_address, args.modbus_method, args.start, args.end, args.value)
