package id.nusantara.mobile;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public final class TerminalCommandProcessorTest {
    @Test public void helpListsSupportedCommands() {
        TerminalCommandProcessor.Result result = TerminalCommandProcessor.execute("help");
        assertFalse(result.clear);
        assertTrue(result.output.get(0).contains("Perintah tersedia"));
    }

    @Test public void echoPreservesText() {
        TerminalCommandProcessor.Result result = TerminalCommandProcessor.execute("echo Halo Nusantara");
        assertEquals("Halo Nusantara", result.output.get(0));
    }

    @Test public void clearRequestsTerminalReset() {
        assertTrue(TerminalCommandProcessor.execute("clear").clear);
    }

    @Test public void runNeverClaimsToExecuteWithoutRuntime() {
        TerminalCommandProcessor.Result result = TerminalCommandProcessor.execute("run program.nusantara");
        assertTrue(result.output.get(0).contains("tidak dieksekusi"));
    }

    @Test public void unknownCommandIsHandledSafely() {
        TerminalCommandProcessor.Result result = TerminalCommandProcessor.execute("rm -rf /");
        assertTrue(result.output.get(0).contains("tidak dikenal"));
    }

    @Test public void nullAndWhitespaceCommandsAreNoOps() {
        assertTrue(TerminalCommandProcessor.execute(null).output.isEmpty());
        assertTrue(TerminalCommandProcessor.execute("   ").output.isEmpty());
    }

    @Test public void commandMatchingIsCaseInsensitive() {
        TerminalCommandProcessor.Result result = TerminalCommandProcessor.execute("HELP");
        assertTrue(result.output.get(0).contains("Perintah tersedia"));
    }

    @Test public void commandWhitespaceIsTrimmed() {
        TerminalCommandProcessor.Result result = TerminalCommandProcessor.execute("  version  ");
        assertEquals("NUSANTARA Mobile IDE 0.50.0", result.output.get(0));
    }

    @Test public void echoSupportsUppercaseCommand() {
        TerminalCommandProcessor.Result result = TerminalCommandProcessor.execute("ECHO Halo");
        assertEquals("Halo", result.output.get(0));
    }
}
